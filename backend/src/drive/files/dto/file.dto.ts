import { z } from 'zod';

export const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().nullable().optional(),
});

export type UpdateFileDto = z.infer<typeof updateFileSchema>;
