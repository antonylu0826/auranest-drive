import { SpaceRole } from '@prisma/client';
import { z } from 'zod';

const spaceRoleSchema = z.nativeEnum(SpaceRole);

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  spaceRole: spaceRoleSchema,
});

export const updateMemberSchema = z.object({
  spaceRole: spaceRoleSchema,
});

export type AddMemberDto = z.infer<typeof addMemberSchema>;
export type UpdateMemberDto = z.infer<typeof updateMemberSchema>;
