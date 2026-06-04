import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtOrApiKeyGuard } from '../auth/guards/jwt-or-api-key.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { WopiTokenGuard } from './wopi-token.guard';
import { WopiTokenService } from './wopi-token.service';

// Keep in sync with frontend/src/lib/api.ts COLLABORA_EXTENSIONS
export const COLLABORA_EXTENSIONS = new Set([
  'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'ott', 'rtf', 'fodt',
  'xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'ods', 'ots', 'csv', 'fods',
  'ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'odp', 'otp', 'fodp', 'odg',
]);

const LOCK_TTL_SEC = 3600; // WOPI lock TTL — separate from WOPI_TOKEN_TTL_SEC

interface AuthRequest extends Request {
  user: { sub: string; email: string; name?: string };
  wopi?: { fileId: string; userId: string; canWrite: boolean };
}

@Controller('wopi')
export class WopiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly wopiToken: WopiTokenService,
  ) {}

  // ── Get editor URL (requires regular JWT auth) ───────────────────────────

  @Get('editor-url/:fileId')
  @UseGuards(JwtOrApiKeyGuard)
  async getEditorUrl(@Param('fileId') fileId: string, @Req() req: AuthRequest) {
    const userId = req.user.sub;

    const file = await this.prisma.driveFile.findUnique({
      where: { id: fileId },
      select: { name: true, ownerId: true, isTrashed: true },
    });
    if (!file || file.isTrashed) throw new NotFoundException('File not found');

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!COLLABORA_EXTENSIONS.has(ext)) {
      throw new ForbiddenException(`File type .${ext} is not supported by the online editor`);
    }

    const share = await this.prisma.fileShare.findUnique({
      where: { fileId_sharedWithId: { fileId, sharedWithId: userId } },
      select: { permission: true },
    });
    const canWrite = file.ownerId === userId || share?.permission === 'EDIT';

    const accessToken = this.wopiToken.issue(fileId, userId, canWrite);
    const wopiPublicUrl = process.env.WOPI_PUBLIC_URL ?? 'http://localhost:3010';
    const collaboraUrl = process.env.COLLABORA_URL ?? 'http://localhost:9980';

    const wopiSrc = encodeURIComponent(`${wopiPublicUrl}/wopi/files/${fileId}`);
    const editorUrl = `${collaboraUrl}/browser/dist/cool.html?WOPISrc=${wopiSrc}&access_token=${accessToken}`;

    return { editorUrl, accessToken };
  }

  // ── WOPI CheckFileInfo ────────────────────────────────────────────────────

  @Get('files/:fileId')
  @UseGuards(WopiTokenGuard)
  async checkFileInfo(@Param('fileId') fileId: string, @Req() req: AuthRequest) {
    const wopi = req.wopi!;
    const [file, user] = await Promise.all([
      this.prisma.driveFile.findUnique({ where: { id: fileId } }),
      this.prisma.user.findUnique({ where: { id: wopi.userId }, select: { name: true, email: true } }),
    ]);
    if (!file || file.isTrashed) throw new NotFoundException('File not found');

    return {
      BaseFileName: file.name,
      Size: file.size,
      OwnerId: file.ownerId,
      UserId: wopi.userId,
      UserFriendlyName: user?.name ?? user?.email ?? wopi.userId,
      UserCanWrite: wopi.canWrite,
      Version: String(file.version),
      LastModifiedTime: file.updatedAt.toISOString(),
      SupportsLocks: true,
      SupportsUpdate: true,
      SupportsGetLock: true,
      UserCanNotWriteRelative: true,
    };
  }

  // ── WOPI GetFile ──────────────────────────────────────────────────────────

  @Get('files/:fileId/contents')
  @UseGuards(WopiTokenGuard)
  async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.prisma.driveFile.findUnique({ where: { id: fileId } });
    if (!file || file.isTrashed) throw new NotFoundException('File not found');

    const stream = await this.storage.getObject(file.storagePath);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    stream.pipe(res);
  }

  // ── WOPI PutFile ──────────────────────────────────────────────────────────

  @Post('files/:fileId/contents')
  @UseGuards(WopiTokenGuard)
  @HttpCode(200)
  async putFile(
    @Param('fileId') fileId: string,
    @Req() req: AuthRequest,
    @Headers() headers: Record<string, string>,
  ) {
    const wopi = req.wopi!;
    if (!wopi.canWrite) throw new ForbiddenException('Read-only token');

    const file = await this.prisma.driveFile.findUnique({ where: { id: fileId } });
    if (!file || file.isTrashed) throw new NotFoundException('File not found');

    // Reject if locked by a different lock token and lock is still fresh
    if (file.lockToken && file.lockToken !== headers['x-wopi-lock']) {
      const lockAge = file.lockedAt ? Date.now() - file.lockedAt.getTime() : Infinity;
      if (lockAge < LOCK_TTL_SEC * 1000) {
        (req.res as Response).setHeader('X-WOPI-Lock', file.lockToken);
        throw new ConflictException('File is locked by another session');
      }
    }

    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new ForbiddenException('Empty or missing file body');
    }

    const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 104_857_600);
    if (body.length > maxBytes) {
      throw new PayloadTooLargeException(`File exceeds maximum size of ${maxBytes} bytes`);
    }

    const contentLength = parseInt(headers['content-length'] ?? '0', 10);
    if (contentLength > 0 && body.length !== contentLength) {
      throw new ForbiddenException(`Size mismatch: expected ${contentLength} got ${body.length}`);
    }

    const newVersion = file.version + 1;
    const newKey = `${file.ownerId}/${file.id}/v${newVersion}/${file.name}`;

    await this.storage.putObject(newKey, body, file.mimeType);
    const updated = await this.prisma.driveFile.update({
      where: { id: fileId },
      data: { storagePath: newKey, version: newVersion, size: body.length },
    });

    return { LastModifiedTime: updated.updatedAt.toISOString() };
  }

  // ── WOPI Lock management ──────────────────────────────────────────────────

  @Post('files/:fileId')
  @UseGuards(WopiTokenGuard)
  @HttpCode(200)
  async manageLock(
    @Param('fileId') fileId: string,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-wopi-override') action?: string,
    @Headers('x-wopi-lock') lockToken?: string,
  ) {
    if (!action) throw new BadRequestException('Missing X-WOPI-Override header');

    const file = await this.prisma.driveFile.findUnique({ where: { id: fileId } });
    if (!file || file.isTrashed) throw new NotFoundException('File not found');

    const isExpired = () =>
      !file.lockToken || !file.lockedAt || Date.now() - file.lockedAt.getTime() >= LOCK_TTL_SEC * 1000;

    switch (action.toUpperCase()) {
      case 'LOCK': {
        if (!lockToken) throw new ForbiddenException('X-WOPI-Lock required');
        if (!isExpired() && file.lockToken !== lockToken) {
          res.setHeader('X-WOPI-Lock', file.lockToken ?? '');
          throw new ConflictException('File already locked by different token');
        }
        await this.prisma.driveFile.update({
          where: { id: fileId },
          data: { lockToken, lockedBy: req.wopi!.userId, lockedAt: new Date() },
        });
        break;
      }
      case 'UNLOCK': {
        if (file.lockToken !== lockToken) {
          res.setHeader('X-WOPI-Lock', file.lockToken ?? '');
          throw new ConflictException('Lock token mismatch');
        }
        await this.prisma.driveFile.update({
          where: { id: fileId },
          data: { lockToken: null, lockedBy: null, lockedAt: null },
        });
        break;
      }
      case 'REFRESH_LOCK': {
        if (isExpired() || file.lockToken !== lockToken) {
          res.setHeader('X-WOPI-Lock', file.lockToken ?? '');
          throw new ConflictException('Lock not found or token mismatch');
        }
        await this.prisma.driveFile.update({
          where: { id: fileId },
          data: { lockedAt: new Date() },
        });
        break;
      }
      case 'GET_LOCK': {
        res.setHeader('X-WOPI-Lock', !isExpired() && file.lockToken ? file.lockToken : '');
        break;
      }
      default:
        throw new ForbiddenException(`Unknown X-WOPI-Override: ${action}`);
    }

    return {};
  }
}
