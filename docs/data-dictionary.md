# Data Dictionary

> Auto-generated from Prisma schema on 2026-06-03.
> Do not edit manually — run `pnpm -C backend schema:docs` to regenerate.

---

## Enums

### UserRole

> System role controlling access level. ADMIN has full CRUD access; USER has read-only access.

| Value | Description |
|-------|-------------|
| `ADMIN` |  |
| `USER` |  |

### SharePermission

> Permission level granted to a user on a shared file.

| Value | Description |
|-------|-------------|
| `VIEW` |  |
| `EDIT` |  |

## Models

### User

> System user account. Used for authentication in local-auth mode. In OIDC mode the password field is unused; identity is verified via JWKS.

**DB table:** `users`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | String | ✓ | ✓ |  |
| `email` | String | ✓ | ✓ | Login email, must be unique across the system. |
| `password` | String | ✓ |  |  |
| `name` | String |  |  | Display name shown in UI; optional. |
| `role` | UserRole | ✓ |  |  |
| `isActive` | Boolean | ✓ |  | Soft-disable without deleting — preserves audit history. |
| `createdAt` | DateTime | ✓ |  |  |
| `updatedAt` | DateTime | ✓ |  |  |

### DriveFolder

> Storage folder for organising files. Supports nested hierarchy via parentId.

**DB table:** `drive_folders`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | String | ✓ | ✓ |  |
| `name` | String | ✓ |  | Display name shown in the file browser. |
| `ownerId` | String | ✓ |  | Owner of this folder. |
| `parentId` | String |  |  | Parent folder; null means root (My Drive). |
| `isTrashed` | Boolean | ✓ |  | Soft-delete — trashed folders hidden from normal view. |
| `createdAt` | DateTime | ✓ |  |  |
| `updatedAt` | DateTime | ✓ |  |  |

### DriveFile

> Uploaded file metadata. Actual binary is stored in an external object store.

**DB table:** `drive_files`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | String | ✓ | ✓ |  |
| `name` | String | ✓ |  | Original filename as uploaded. |
| `mimeType` | String | ✓ |  | MIME type detected at upload time, e.g. "image/png". |
| `size` | Int | ✓ |  | File size in bytes. |
| `storagePath` | String | ✓ |  | Path or key in the external object store (S3-compatible). |
| `ownerId` | String | ✓ |  | Owner of this file. |
| `folderId` | String |  |  | Containing folder; null means root (My Drive). |
| `isTrashed` | Boolean | ✓ |  | Soft-delete flag. |
| `version` | Int | ✓ |  | Monotonically increasing version counter; incremented on each online-editor save. |
| `lockToken` | String |  |  | WOPI lock token held by the Collabora server during an active edit session. |
| `lockedBy` | String |  |  | User ID that holds the current lock. |
| `lockedAt` | DateTime |  |  | Timestamp when the lock was acquired or last refreshed. |
| `createdAt` | DateTime | ✓ |  |  |
| `updatedAt` | DateTime | ✓ |  |  |

### FileShare

> Sharing record granting a user access to a specific file.

**DB table:** `file_shares`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | String | ✓ | ✓ |  |
| `fileId` | String | ✓ |  |  |
| `sharedWithId` | String | ✓ |  | User granted access. |
| `permission` | SharePermission | ✓ |  |  |
| `createdAt` | DateTime | ✓ |  |  |
