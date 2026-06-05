import { Injectable } from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { maxSpaceRole } from './space-role.util';

@Injectable()
export class SpaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the effective SpaceRole for a user in a given space.
   * Takes the max of: SpaceRoleGrant (via system role) and SpaceMember (per-user).
   * Returns null if the user has no access.
   */
  async resolveEffectiveRole(
    userId: string,
    roleId: string | undefined,
    spaceId: string,
  ): Promise<SpaceRole | null> {
    const [roleGrant, member] = await Promise.all([
      roleId
        ? this.prisma.spaceRoleGrant.findUnique({
            where: { spaceId_systemRoleId: { spaceId, systemRoleId: roleId } },
            select: { spaceRole: true },
          })
        : Promise.resolve(null),
      this.prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId, userId } },
        select: { spaceRole: true },
      }),
    ]);

    return maxSpaceRole(roleGrant?.spaceRole, member?.spaceRole);
  }

  /** Returns all spaceIds in the system. Used for ADMIN cross-space queries. */
  async getAllSpaceIds(): Promise<string[]> {
    const spaces = await this.prisma.space.findMany({ select: { id: true } });
    return spaces.map((s) => s.id);
  }

  /**
   * Returns all spaceIds the user can access (via SpaceMember OR SpaceRoleGrant).
   * Used for cross-space queries like recent files.
   */
  async getAccessibleSpaceIds(userId: string, roleId: string | undefined): Promise<string[]> {
    const [memberSpaces, grantSpaces] = await Promise.all([
      this.prisma.spaceMember.findMany({
        where: { userId },
        select: { spaceId: true },
      }),
      roleId
        ? this.prisma.spaceRoleGrant.findMany({
            where: { systemRoleId: roleId },
            select: { spaceId: true },
          })
        : Promise.resolve([]),
    ]);

    const ids = new Set([
      ...memberSpaces.map((m) => m.spaceId),
      ...grantSpaces.map((g) => g.spaceId),
    ]);
    return Array.from(ids);
  }
}
