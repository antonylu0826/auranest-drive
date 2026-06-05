# Data Dictionary

> Auto-generated from Prisma schema on 2026-06-05.
> Do not edit manually — run `pnpm -C backend schema:docs` to regenerate.

---

## Enums

### PermissionPolicy

> Default policy controlling how permission checks behave for a role. DENY_ALL: only explicitly granted permissions pass (default for all new roles). READ_ALL: all *_READ permissions pass automatically; writes/deletes require explicit grants. ALLOW_ALL: every permission check passes — custom ADMIN-level bypass for non-system roles.

| Value | Description |
|-------|-------------|
| `DENY_ALL` |  |
| `READ_ALL` |  |
| `ALLOW_ALL` |  |

### Permission

> Granular permission assignable to a custom Role. ADMIN bypasses all checks; these values are only evaluated for non-ADMIN roles. Embedded in the JWT at login.

| Value | Description |
|-------|-------------|
| `USERS_READ` |  |
| `USERS_CREATE` |  |
| `USERS_UPDATE` |  |
| `USERS_DELETE` |  |
| `API_KEYS_READ` |  |
| `API_KEYS_CREATE` |  |
| `API_KEYS_DELETE` |  |
| `DRIVE_FILE_READ` |  |
| `DRIVE_FILE_CREATE` |  |
| `DRIVE_FILE_UPDATE` |  |
| `DRIVE_FILE_DELETE` |  |
| `DRIVE_FILE_SHARE` |  |
| `DRIVE_FOLDER_READ` |  |
| `DRIVE_FOLDER_CREATE` |  |
| `DRIVE_FOLDER_UPDATE` |  |
| `DRIVE_FOLDER_DELETE` |  |

### SharePermission

> Permission level granted to a user on a shared file.

| Value | Description |
|-------|-------------|
| `VIEW` |  |
| `EDIT` |  |

## Models

### Role

> System role or custom role. ADMIN and USER are seeded system roles and cannot be deleted.

**DB table:** `roles`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | String | ✓ | ✓ |  |
| `name` | String | ✓ | ✓ | Unique machine name, e.g. "ADMIN", "USER", "EDITOR". Used in JWT roleName field. |
| `displayName` | String | ✓ |  | Human-readable label shown in UI. |
| `isSystem` | Boolean | ✓ |  | System roles (ADMIN / USER) cannot be deleted or renamed. |
| `permissionPolicy` | PermissionPolicy | ✓ |  | Default deny; explicit permissions in RolePermission are additive on top of the policy. |
| `createdAt` | DateTime | ✓ |  |  |
| `updatedAt` | DateTime | ✓ |  |  |

### RolePermission

> Junction table between Role and Permission enum values. @internal Marked @internal so MetaService excludes it from the auto-derived scope catalog.

**DB table:** `role_permissions`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | String | ✓ | ✓ |  |
| `roleId` | String | ✓ |  |  |
| `permission` | Permission | ✓ |  |  |

### User

> System user account. Used for authentication in local-auth mode. In OIDC mode the password field is unused; identity is verified via JWKS.

**DB table:** `users`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | String | ✓ | ✓ |  |
| `email` | String | ✓ | ✓ | Login email, must be unique across the system. |
| `password` | String | ✓ |  |  |
| `name` | String |  |  | Display name shown in UI; optional. |
| `roleId` | String | ✓ |  |  |
| `isActive` | Boolean | ✓ |  | Soft-disable without deleting — preserves audit history. |
| `createdAt` | DateTime | ✓ |  |  |
| `updatedAt` | DateTime | ✓ |  |  |

### ApiKey

> Machine-to-machine API key for external integrations (n8n, AI agents). Created by ADMIN only. Raw key is shown once at creation and never stored. @internal

**DB table:** `api_keys`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `id` | String | ✓ | ✓ |  |
| `name` | String | ✓ |  | Human-readable label, e.g. "n8n production" or "AI agent read-only". |
| `prefix` | String | ✓ |  | First 16 chars of the raw key, shown in lists for identification (e.g. "an_live_a1b2c3d4"). |
| `hashedKey` | String | ✓ | ✓ | SHA-256 hash of the raw key. The raw key is never persisted. |
| `roleId` | String | ✓ |  | Role this key authenticates as; FK to roles table. |
| `scopes` | String[] | ✓ |  | Module-level scopes, e.g. ["users:read","employees:*"]. "*" = all scopes. Empty = deny all. |
| `rateLimit` | Int |  |  | Requests per minute. null = system default (60). |
| `isActive` | Boolean | ✓ |  | Whether this key can be used. Set false to revoke without deleting. |
| `expiresAt` | DateTime |  |  | Optional expiry. null = never expires. |
| `createdBy` | String |  |  | Email of the ADMIN who created this key. Snapshot string, no FK. |
| `lastUsedAt` | DateTime |  |  | Timestamp of last successful authentication with this key. |
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
