import { SpaceRole } from '@prisma/client';
import { z } from 'zod';

const spaceRoleSchema = z.nativeEnum(SpaceRole);

export const addRoleGrantSchema = z.object({
  systemRoleId: z.string().min(1),
  spaceRole: spaceRoleSchema,
});

export const updateRoleGrantSchema = z.object({
  spaceRole: spaceRoleSchema,
});

export type AddRoleGrantDto = z.infer<typeof addRoleGrantSchema>;
export type UpdateRoleGrantDto = z.infer<typeof updateRoleGrantSchema>;
