import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, toPrismaOrderBy, toPrismaPage, type PaginationQuery } from '../../common/pagination';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';

const SORTABLE = ['name', 'createdAt'] as const;

const FOLDER_FIELDS = {
  id: true,
  name: true,
  spaceId: true,
  createdById: true,
  parentId: true,
  isTrashed: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createdById: string, dto: CreateFolderDto) {
    if (dto.parentId) await this.assertSameSpace(dto.spaceId, dto.parentId);
    return this.prisma.driveFolder.create({
      data: { name: dto.name, spaceId: dto.spaceId, createdById, parentId: dto.parentId ?? null },
      select: FOLDER_FIELDS,
    });
  }

  async findAll(
    spaceId: string,
    query: PaginationQuery & { parentId?: string; trashed?: boolean },
  ) {
    const { skip, take } = toPrismaPage(query);
    const orderBy = toPrismaOrderBy(query, SORTABLE, { createdAt: 'desc' });
    const where = {
      spaceId,
      parentId: query.parentId !== undefined ? query.parentId : null,
      isTrashed: query.trashed ?? false,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.driveFolder.findMany({ where, skip, take, orderBy, select: FOLDER_FIELDS }),
      this.prisma.driveFolder.count({ where }),
    ]);
    return paginate(data, total);
  }

  async findOne(id: string) {
    const folder = await this.prisma.driveFolder.findUnique({ where: { id }, select: FOLDER_FIELDS });
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async update(id: string, dto: UpdateFolderDto) {
    const folder = await this.findOne(id);
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) throw new BadRequestException('A folder cannot be its own parent');
      if (dto.parentId) await this.assertSameSpace(folder.spaceId, dto.parentId);
    }
    return this.prisma.driveFolder.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      select: FOLDER_FIELDS,
    });
  }

  async trash(id: string) {
    await this.findOne(id);
    return this.prisma.driveFolder.update({ where: { id }, data: { isTrashed: true }, select: FOLDER_FIELDS });
  }

  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.driveFolder.update({ where: { id }, data: { isTrashed: false }, select: FOLDER_FIELDS });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.driveFolder.delete({ where: { id } });
  }

  async emptyTrash(spaceId: string) {
    const result = await this.prisma.driveFolder.deleteMany({ where: { spaceId, isTrashed: true } });
    return { count: result.count };
  }

  private async assertSameSpace(spaceId: string, folderId: string) {
    const f = await this.prisma.driveFolder.findUnique({ where: { id: folderId }, select: { spaceId: true } });
    if (!f) throw new NotFoundException('Parent folder not found');
    if (f.spaceId !== spaceId) throw new BadRequestException('Cannot move folder across spaces');
  }
}
