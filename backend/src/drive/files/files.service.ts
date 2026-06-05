import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { paginate, toPrismaOrderBy, toPrismaPage, type PaginationQuery } from '../../common/pagination';
import { UpdateFileDto } from './dto/file.dto';

const SORTABLE = ['name', 'size', 'createdAt', 'updatedAt'] as const;

const FILE_FIELDS = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  storagePath: true,
  spaceId: true,
  createdById: true,
  folderId: true,
  isTrashed: true,
  version: true,
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
    createdById: string,
    spaceId: string,
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
    if (folderId) await this.assertFolderInSpace(spaceId, folderId);

    const fileId = randomBytes(12).toString('hex');
    const storagePath = `${spaceId}/${fileId}/${originalName}`;

    await this.storage.putObject(storagePath, buffer, mimeType);

    return this.prisma.driveFile.create({
      data: { id: fileId, name: originalName, mimeType, size: buffer.length, storagePath, spaceId, createdById, folderId },
      select: FILE_FIELDS,
    });
  }

  async findAll(spaceId: string, query: PaginationQuery & { folderId?: string; trashed?: boolean }) {
    const { skip, take } = toPrismaPage(query);
    const orderBy = toPrismaOrderBy(query, SORTABLE, { createdAt: 'desc' });
    const where = {
      spaceId,
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

  async findRecent(
    accessibleSpaceIds: string[],
    query: PaginationQuery,
  ) {
    const { skip, take } = toPrismaPage(query);
    const where = { spaceId: { in: accessibleSpaceIds }, isTrashed: false };
    const [data, total] = await Promise.all([
      this.prisma.driveFile.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        select: { ...FILE_FIELDS, space: { select: { id: true, name: true } } },
      }),
      this.prisma.driveFile.count({ where }),
    ]);
    return paginate(data, total);
  }

  async findOne(id: string) {
    const file = await this.prisma.driveFile.findUnique({ where: { id }, select: FILE_FIELDS });
    if (!file || file.isTrashed) throw new NotFoundException('File not found');
    return file;
  }

  async getDownloadUrl(id: string): Promise<string> {
    const file = await this.findOne(id);
    return this.storage.getPresignedDownloadUrl(file.storagePath);
  }

  async update(id: string, dto: UpdateFileDto) {
    const file = await this.findOne(id);
    if (dto.folderId) await this.assertFolderInSpace(file.spaceId, dto.folderId);
    return this.prisma.driveFile.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.folderId !== undefined && { folderId: dto.folderId }),
      },
      select: FILE_FIELDS,
    });
  }

  async trash(id: string) {
    await this.findOne(id);
    return this.prisma.driveFile.update({ where: { id }, data: { isTrashed: true }, select: FILE_FIELDS });
  }

  async restore(id: string) {
    await this.prisma.driveFile.findUniqueOrThrow({ where: { id } });
    return this.prisma.driveFile.update({ where: { id }, data: { isTrashed: false }, select: FILE_FIELDS });
  }

  async remove(id: string) {
    // findUniqueOrThrow bypasses isTrashed so permanently-deleting a trashed file works
    const file = await this.prisma.driveFile.findUniqueOrThrow({ where: { id }, select: FILE_FIELDS });
    await this.storage.deleteObject(file.storagePath);
    await this.prisma.driveFile.delete({ where: { id } });
  }

  async emptyTrash(spaceId: string) {
    const files = await this.prisma.driveFile.findMany({
      where: { spaceId, isTrashed: true },
      select: { id: true, storagePath: true },
    });
    const results = await Promise.allSettled(files.map((f) => this.storage.deleteObject(f.storagePath)));
    for (const [i, r] of results.entries()) {
      if (r.status === 'rejected') console.error(`Failed to delete MinIO object ${files[i].storagePath}:`, r.reason);
    }
    await this.prisma.driveFile.deleteMany({ where: { spaceId, isTrashed: true } });
    return { count: files.length };
  }

  private async assertFolderInSpace(spaceId: string, folderId: string) {
    const folder = await this.prisma.driveFolder.findUnique({
      where: { id: folderId },
      select: { spaceId: true, isTrashed: true },
    });
    if (!folder) throw new NotFoundException('Target folder not found');
    if (folder.spaceId !== spaceId) throw new BadRequestException('Cannot move file across spaces');
    if (folder.isTrashed) throw new BadRequestException('Cannot move file into a trashed folder');
  }
}
