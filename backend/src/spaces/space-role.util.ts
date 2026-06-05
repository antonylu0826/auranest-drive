import { SpaceRole } from '@prisma/client';

const LEVEL: Record<SpaceRole, number> = {
  [SpaceRole.VIEWER]: 1,
  [SpaceRole.EDITOR]: 2,
  [SpaceRole.OWNER]: 3,
};

export function spaceRoleLevel(role: SpaceRole): number {
  return LEVEL[role];
}

export function maxSpaceRole(a?: SpaceRole | null, b?: SpaceRole | null): SpaceRole | null {
  if (!a && !b) return null;
  if (!a) return b!;
  if (!b) return a;
  return LEVEL[a] >= LEVEL[b] ? a : b;
}

export function meetsRequiredRole(effective: SpaceRole, required: SpaceRole): boolean {
  return LEVEL[effective] >= LEVEL[required];
}
