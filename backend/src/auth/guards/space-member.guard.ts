import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SpaceRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SpaceAccessService } from '../../spaces/space-access.service';
import { SPACE_ROLE_KEY, SpaceRoleMeta } from '../decorators/require-space-role.decorator';
import { SYSTEM_ADMIN_ROLE } from '../constants';
import { meetsRequiredRole } from '../../spaces/space-role.util';

@Injectable()
export class SpaceMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly spaceAccess: SpaceAccessService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<SpaceRoleMeta>(SPACE_ROLE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!meta) return true;

    const req = ctx.switchToHttp().getRequest<{
      user?: { sub?: string; roleId?: string; roleName?: string };
      params?: Record<string, string>;
      query?: Record<string, string>;
      body?: Record<string, string>;
    }>();

    const user = req.user;
    if (!user?.sub) throw new ForbiddenException();

    // ADMIN always bypasses space-level checks
    if (user.roleName === SYSTEM_ADMIN_ROLE) return true;

    const spaceId = await this.resolveSpaceId(meta.source, req);
    if (!spaceId) throw new ForbiddenException();

    const effective = await this.spaceAccess.resolveEffectiveRole(
      user.sub,
      user.roleId,
      spaceId,
    );
    if (!effective) throw new ForbiddenException();

    if (!meetsRequiredRole(effective, meta.role)) throw new ForbiddenException();

    // Attach resolved spaceId and role to request for downstream use
    (req as Record<string, unknown>)['spaceId'] = spaceId;
    (req as Record<string, unknown>)['effectiveSpaceRole'] = effective;

    return true;
  }

  private async resolveSpaceId(
    source: SpaceRoleMeta['source'],
    req: { params?: Record<string, string>; query?: Record<string, string>; body?: Record<string, string> },
  ): Promise<string | null> {
    switch (source) {
      case 'query':
        return req.query?.spaceId ?? null;

      case 'body':
        return req.body?.spaceId ?? null;

      case 'space-param':
        return req.params?.id ?? null;

      case 'file-param': {
        const fileId = req.params?.id;
        if (!fileId) return null;
        const file = await this.prisma.driveFile.findUnique({
          where: { id: fileId },
          select: { spaceId: true },
        });
        return file?.spaceId ?? null;
      }

      case 'folder-param': {
        const folderId = req.params?.id;
        if (!folderId) return null;
        const folder = await this.prisma.driveFolder.findUnique({
          where: { id: folderId },
          select: { spaceId: true },
        });
        return folder?.spaceId ?? null;
      }
    }
  }
}
