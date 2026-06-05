import { SetMetadata } from '@nestjs/common';
import { SpaceRole } from '@prisma/client';

export const SPACE_ROLE_KEY = 'requiredSpaceRole';

export type SpaceIdSource =
  | 'query'        // req.query.spaceId
  | 'body'         // req.body.spaceId (JSON POST endpoints)
  | 'space-param'  // req.params.id IS the spaceId (Space CRUD routes)
  | 'file-param'   // lookup DriveFile by req.params.id → file.spaceId
  | 'folder-param' // lookup DriveFolder by req.params.id → folder.spaceId

export interface SpaceRoleMeta {
  role: SpaceRole;
  source: SpaceIdSource;
}

export const RequireSpaceRole = (role: SpaceRole, source: SpaceIdSource = 'query') =>
  SetMetadata(SPACE_ROLE_KEY, { role, source } satisfies SpaceRoleMeta);
