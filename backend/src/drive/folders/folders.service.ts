import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, toPrismaOrderBy, toPrismaPage, type PaginationQuery } from '../../common/pagination';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';

const SORTABLE = ['name', 'createdAt'] as const;

const FOLDER_FIELDS = {
  id: true,
  name: true,
  ownerId: true,
  parentId: true,
  isTrashed: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateFolderDto) {
    if (dto.parentId) await this.assertOwns(ownerId, dto.parentId);
    return this.prisma.driveFolder.create({
      data: { name: dto.name, ownerId, parentId: dto.parentId ?? null },
      select: FOLDER_FIELDS,
    });
  }

  async findAll(ownerId: string, query: PaginationQuery & { parentId?: string; trashed?: boolean }) {
    const { skip, take } = toPrismaPage(query);
    const orderBy = toPrismaOrderBy(query, SORTABLE, { createdAt: 'desc' });
    const where = {
      ownerId,
      parentId: query.parentId ?? null,
      isTrashed: query.trashed ?? false,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.driveFolder.findMany({ where, skip, take, orderBy, select: FOLDER_FIELDS }),
      this.prisma.driveFolder.count({ where }),
    ]);
    return paginate(data, total);
  }

  async findOne(ownerId: string, id: string) {
    const folder = await this.prisma.driveFolder.findUnique({ where: { id }, select: FOLDER_FIELDS });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenException();
    return folder;
  }

  async update(ownerId: string, id: string, dto: UpdateFolderDto) {
    await this.findOne(ownerId, id);
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) throw new BadRequestException('A folder cannot be its own parent');
      if (dto.parentId) await this.assertOwns(ownerId, dto.parentId);
    }
    return this.prisma.driveFolder.update({
      where: { id },
      data: dto,
      select: FOLDER_FIELDS,
    });
  }

  async trash(ownerId: string, id: string) {
    await this.findOne(ownerId, id);
    return this.prisma.driveFolder.update({ where: { id }, data: { isTrashed: true }, select: FOLDER_FIELDS });
  }

  async restore(ownerId: string, id: string) {
    await this.findOne(ownerId, id);
    return this.prisma.driveFolder.update({ where: { id }, data: { isTrashed: false }, select: FOLDER_FIELDS });
  }

  async remove(ownerId: string, id: string) {
    await this.findOne(ownerId, id);
    await this.prisma.driveFolder.delete({ where: { id } });
  }

  async emptyTrash(ownerId: string) {
    const result = await this.prisma.driveFolder.deleteMany({ where: { ownerId, isTrashed: true } });
    return { count: result.count };
  }

  private async assertOwns(ownerId: string, folderId: string) {
    const f = await this.prisma.driveFolder.findUnique({ where: { id: folderId }, select: { ownerId: true } });
    if (!f) throw new NotFoundException('Parent folder not found');
    if (f.ownerId !== ownerId) throw new ForbiddenException();
  }
}
