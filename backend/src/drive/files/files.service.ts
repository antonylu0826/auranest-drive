import { randomBytes } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { paginate, toPrismaOrderBy, toPrismaPage, type PaginationQuery } from '../../common/pagination';
import { ShareFileDto, UpdateFileDto } from './dto/file.dto';

const SORTABLE = ['name', 'size', 'createdAt', 'updatedAt'] as const;

const FILE_FIELDS = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  storagePath: true,
  ownerId: true,
  folderId: true,
  isTrashed: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class FilesService {
  private readonly maxUploadBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    this.maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 104_857_600);
  }

  async upload(
    ownerId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folderId: string | null,
  ) {
    if (buffer.length > this.maxUploadBytes) {
      throw new PayloadTooLargeException(
        `File exceeds maximum upload size of ${this.maxUploadBytes} bytes`,
      );
    }

    const fileId = randomBytes(12).toString('hex');
    const storagePath = `${ownerId}/${fileId}/${originalName}`;

    await this.storage.putObject(storagePath, buffer, mimeType);

    return this.prisma.driveFile.create({
      data: { id: fileId, name: originalName, mimeType, size: buffer.length, storagePath, ownerId, folderId },
      select: FILE_FIELDS,
    });
  }

  async findAll(ownerId: string, query: PaginationQuery & { folderId?: string; trashed?: boolean }) {
    const { skip, take } = toPrismaPage(query);
    const orderBy = toPrismaOrderBy(query, SORTABLE, { createdAt: 'desc' });
    const where = {
      ownerId,
      folderId: query.folderId !== undefined ? (query.folderId || null) : null,
      isTrashed: query.trashed ?? false,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.driveFile.findMany({ where, skip, take, orderBy, select: FILE_FIELDS }),
      this.prisma.driveFile.count({ where }),
    ]);
    return paginate(data, total);
  }

  async findSharedWithMe(userId: string, query: PaginationQuery) {
    const { skip, take } = toPrismaPage(query);
    const where = { sharedWithId: userId };
    const [shares, total] = await Promise.all([
      this.prisma.fileShare.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          permission: true,
          createdAt: true,
          file: { select: FILE_FIELDS },
        },
      }),
      this.prisma.fileShare.count({ where }),
    ]);
    return paginate(shares, total);
  }

  async findOne(userId: string, id: string) {
    const file = await this.prisma.driveFile.findUnique({ where: { id }, select: FILE_FIELDS });
    if (!file || file.isTrashed) throw new NotFoundException('File not found');
    if (file.ownerId !== userId) {
      const share = await this.prisma.fileShare.findUnique({
        where: { fileId_sharedWithId: { fileId: id, sharedWithId: userId } },
      });
      if (!share) throw new ForbiddenException();
    }
    return file;
  }

  async getDownloadUrl(userId: string, id: string): Promise<string> {
    const file = await this.findOne(userId, id);
    return this.storage.getPresignedDownloadUrl(file.storagePath);
  }

  async update(ownerId: string, id: string, dto: UpdateFileDto) {
    await this.assertOwns(ownerId, id);
    if (dto.folderId) {
      const folder = await this.prisma.driveFolder.findUnique({ where: { id: dto.folderId }, select: { ownerId: true } });
      if (!folder) throw new NotFoundException('Target folder not found');
      if (folder.ownerId !== ownerId) throw new ForbiddenException();
    }
    return this.prisma.driveFile.update({ where: { id }, data: dto, select: FILE_FIELDS });
  }

  async trash(ownerId: string, id: string) {
    await this.assertOwns(ownerId, id);
    return this.prisma.driveFile.update({ where: { id }, data: { isTrashed: true }, select: FILE_FIELDS });
  }

  async restore(ownerId: string, id: string) {
    await this.assertOwns(ownerId, id);
    return this.prisma.driveFile.update({ where: { id }, data: { isTrashed: false }, select: FILE_FIELDS });
  }

  async remove(ownerId: string, id: string) {
    const file = await this.assertOwns(ownerId, id);
    await this.storage.deleteObject(file.storagePath);
    await this.prisma.driveFile.delete({ where: { id } });
  }

  async emptyTrash(ownerId: string) {
    const files = await this.prisma.driveFile.findMany({
      where: { ownerId, isTrashed: true },
      select: { id: true, storagePath: true },
    });
    await Promise.allSettled(files.map((f) => this.storage.deleteObject(f.storagePath)));
    await this.prisma.driveFile.deleteMany({ where: { ownerId, isTrashed: true } });
    return { count: files.length };
  }

  async share(ownerId: string, fileId: string, dto: ShareFileDto) {
    await this.assertOwns(ownerId, fileId);
    try {
      return await this.prisma.fileShare.create({
        data: { fileId, sharedWithId: dto.sharedWithId, permission: dto.permission },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('File already shared with this user');
      }
      throw e;
    }
  }

  async unshare(ownerId: string, fileId: string, sharedWithId: string) {
    await this.assertOwns(ownerId, fileId);
    await this.prisma.fileShare.deleteMany({ where: { fileId, sharedWithId } });
  }

  private async assertOwns(ownerId: string, fileId: string) {
    const f = await this.prisma.driveFile.findUnique({ where: { id: fileId }, select: { ownerId: true, storagePath: true } });
    if (!f) throw new NotFoundException('File not found');
    if (f.ownerId !== ownerId) throw new ForbiddenException();
    return f;
  }
}
