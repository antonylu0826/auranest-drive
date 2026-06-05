import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SpaceAccessService } from './space-access.service';
import { CreateSpaceDto, UpdateSpaceDto } from './dto/space.dto';
import { AddMemberDto, UpdateMemberDto } from './dto/space-member.dto';
import { AddRoleGrantDto, UpdateRoleGrantDto } from './dto/space-role-grant.dto';

@Injectable()
export class SpacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  // ── Space CRUD ────────────────────────────────────────────────────────────

  async findAll(userId: string, roleId: string | undefined, isAdmin: boolean) {
    if (isAdmin) {
      return this.prisma.space.findMany({ orderBy: { name: 'asc' } });
    }
    const ids = await this.spaceAccess.getAccessibleSpaceIds(userId, roleId);
    return this.prisma.space.findMany({
      where: { id: { in: ids } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const space = await this.prisma.space.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        roleGrants: { include: { systemRole: { select: { id: true, name: true, displayName: true } } } },
      },
    });
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  async create(createdById: string, dto: CreateSpaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: { name: dto.name, description: dto.description, createdById },
      });
      await tx.spaceMember.create({
        data: { spaceId: space.id, userId: createdById, spaceRole: SpaceRole.OWNER },
      });
      return space;
    });
  }

  async update(id: string, dto: UpdateSpaceDto) {
    await this.findOne(id);
    return this.prisma.space.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Delete all MinIO objects before cascading DB delete
    const files = await this.prisma.driveFile.findMany({
      where: { spaceId: id },
      select: { storagePath: true },
    });
    const results = await Promise.allSettled(files.map((f) => this.storage.deleteObject(f.storagePath)));
    for (const [i, r] of results.entries()) {
      if (r.status === 'rejected') console.error(`Failed to delete MinIO object ${files[i].storagePath}:`, r.reason);
    }
    await this.prisma.space.delete({ where: { id } });
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async findMembers(spaceId: string) {
    return this.prisma.spaceMember.findMany({
      where: { spaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(spaceId: string, dto: AddMemberDto) {
    const existing = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException('User is already a member of this space');
    return this.prisma.spaceMember.create({
      data: { spaceId, userId: dto.userId, spaceRole: dto.spaceRole },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async updateMember(spaceId: string, userId: string, dto: UpdateMemberDto) {
    if (dto.spaceRole !== SpaceRole.OWNER) {
      await this.guardLastOwner(spaceId, userId);
    }
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.spaceMember.update({
      where: { spaceId_userId: { spaceId, userId } },
      data: { spaceRole: dto.spaceRole },
    });
  }

  async removeMember(spaceId: string, userId: string) {
    await this.guardLastOwner(spaceId, userId);
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.spaceMember.delete({ where: { spaceId_userId: { spaceId, userId } } });
  }

  private async guardLastOwner(spaceId: string, userId: string) {
    const ownerCount = await this.prisma.spaceMember.count({
      where: { spaceId, spaceRole: SpaceRole.OWNER },
    });
    const target = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
      select: { spaceRole: true },
    });
    if (target?.spaceRole === SpaceRole.OWNER && ownerCount <= 1) {
      throw new BadRequestException('Cannot remove or demote the last OWNER of a space');
    }
  }

  // ── Role Grants ───────────────────────────────────────────────────────────

  async findRoleGrants(spaceId: string) {
    return this.prisma.spaceRoleGrant.findMany({
      where: { spaceId },
      include: { systemRole: { select: { id: true, name: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addRoleGrant(spaceId: string, dto: AddRoleGrantDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.systemRoleId } });
    if (!role) throw new NotFoundException('Role not found');
    const existing = await this.prisma.spaceRoleGrant.findUnique({
      where: { spaceId_systemRoleId: { spaceId, systemRoleId: dto.systemRoleId } },
    });
    if (existing) throw new ConflictException('This role already has a grant in this space');
    return this.prisma.spaceRoleGrant.create({
      data: { spaceId, systemRoleId: dto.systemRoleId, spaceRole: dto.spaceRole },
      include: { systemRole: { select: { id: true, name: true, displayName: true } } },
    });
  }

  async updateRoleGrant(spaceId: string, systemRoleId: string, dto: UpdateRoleGrantDto) {
    const grant = await this.prisma.spaceRoleGrant.findUnique({
      where: { spaceId_systemRoleId: { spaceId, systemRoleId } },
    });
    if (!grant) throw new NotFoundException('Role grant not found');
    return this.prisma.spaceRoleGrant.update({
      where: { spaceId_systemRoleId: { spaceId, systemRoleId } },
      data: { spaceRole: dto.spaceRole },
    });
  }

  async removeRoleGrant(spaceId: string, systemRoleId: string) {
    const grant = await this.prisma.spaceRoleGrant.findUnique({
      where: { spaceId_systemRoleId: { spaceId, systemRoleId } },
    });
    if (!grant) throw new NotFoundException('Role grant not found');
    await this.prisma.spaceRoleGrant.delete({
      where: { spaceId_systemRoleId: { spaceId, systemRoleId } },
    });
  }

}
