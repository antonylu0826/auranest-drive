import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permission, SpaceRole } from '@prisma/client';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { RequireSpaceRole } from '../../auth/decorators/require-space-role.decorator';
import { JwtOrApiKeyGuard } from '../../auth/guards/jwt-or-api-key.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { SpaceMemberGuard } from '../../auth/guards/space-member.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { paginationQuerySchema, type PaginationQuery } from '../../common/pagination';
import { SpaceAccessService } from '../../spaces/space-access.service';
import { SYSTEM_ADMIN_ROLE } from '../../auth/constants';
import { updateFileSchema, UpdateFileDto } from './dto/file.dto';
import { FilesService } from './files.service';

interface AuthRequest {
  user: { sub: string; roleId?: string; roleName: string };
}

@Controller('drive/files')
@UseGuards(JwtOrApiKeyGuard, PermissionGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  // spaceId must be in query string — Guard runs before Multer parses multipart body
  @Post('upload')
  @RequirePermissions(Permission.DRIVE_FILE_CREATE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'query')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Query('spaceId') spaceId: string,
    @Query('folderId') folderId?: string,
  ) {
    if (!spaceId) throw new BadRequestException('spaceId is required');
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.filesService.upload(
      req.user.sub,
      spaceId,
      file.buffer,
      originalName,
      file.mimetype,
      folderId ?? null,
    );
  }

  @Get()
  @RequirePermissions(Permission.DRIVE_FILE_READ)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.VIEWER, 'query')
  findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('spaceId') spaceId: string,
    @Query('folderId') folderId?: string,
    @Query('trashed') trashed?: string,
  ) {
    if (!spaceId) throw new BadRequestException('spaceId is required');
    return this.filesService.findAll(spaceId, {
      ...query,
      folderId,
      trashed: trashed === 'true',
    });
  }

  @Post('trash/empty')
  @RequirePermissions(Permission.DRIVE_FILE_DELETE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'query')
  @HttpCode(200)
  emptyTrash(@Query('spaceId') spaceId: string) {
    if (!spaceId) throw new BadRequestException('spaceId is required');
    return this.filesService.emptyTrash(spaceId);
  }

  @Get('recent')
  @RequirePermissions(Permission.DRIVE_FILE_READ)
  async findRecent(
    @Request() req: AuthRequest,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    const isAdmin = req.user.roleName === SYSTEM_ADMIN_ROLE;
    const spaceIds = isAdmin
      ? await this.spaceAccess.getAllSpaceIds()
      : await this.spaceAccess.getAccessibleSpaceIds(req.user.sub, req.user.roleId);
    return this.filesService.findRecent(spaceIds, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.DRIVE_FILE_READ)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.VIEWER, 'file-param')
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Get(':id/download')
  @RequirePermissions(Permission.DRIVE_FILE_READ)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.VIEWER, 'file-param')
  async download(@Param('id') id: string) {
    const url = await this.filesService.getDownloadUrl(id);
    return { url };
  }

  @Patch(':id')
  @RequirePermissions(Permission.DRIVE_FILE_UPDATE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'file-param')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFileSchema)) dto: UpdateFileDto,
  ) {
    return this.filesService.update(id, dto);
  }

  @Patch(':id/trash')
  @RequirePermissions(Permission.DRIVE_FILE_UPDATE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'file-param')
  trash(@Param('id') id: string) {
    return this.filesService.trash(id);
  }

  @Patch(':id/restore')
  @RequirePermissions(Permission.DRIVE_FILE_UPDATE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'file-param')
  restore(@Param('id') id: string) {
    return this.filesService.restore(id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DRIVE_FILE_DELETE)
  @UseGuards(SpaceMemberGuard)
  @RequireSpaceRole(SpaceRole.EDITOR, 'file-param')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.filesService.remove(id);
  }
}
