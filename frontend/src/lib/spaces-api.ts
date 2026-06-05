import { apiFetch, type ListQuery, type PaginatedResult } from "./api";
import type { RoleRef } from "./roles-api";
import type { User } from "./api";

export type SpaceRole = "OWNER" | "EDITOR" | "VIEWER";

export interface Space {
  id: string;
  name: string;
  description: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceDetail extends Space {
  members: SpaceMember[];
  roleGrants: SpaceRoleGrant[];
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  user: Pick<User, "id" | "email" | "name">;
  spaceRole: SpaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceRoleGrant {
  id: string;
  spaceId: string;
  systemRoleId: string;
  systemRole: Pick<RoleRef, "id" | "name" | "displayName">;
  spaceRole: SpaceRole;
  createdAt: string;
  updatedAt: string;
}

export const spacesApi = {
  list: () => apiFetch<Space[]>("/spaces"),

  get: (id: string) => apiFetch<SpaceDetail>(`/spaces/${id}`),

  create: (data: { name: string; description?: string }) =>
    apiFetch<Space>("/spaces", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: { name?: string; description?: string | null }) =>
    apiFetch<Space>(`/spaces/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  remove: (id: string) => apiFetch<void>(`/spaces/${id}`, { method: "DELETE" }),

  // Members
  listMembers: (spaceId: string) =>
    apiFetch<SpaceMember[]>(`/spaces/${spaceId}/members`),

  addMember: (spaceId: string, data: { userId: string; spaceRole: SpaceRole }) =>
    apiFetch<SpaceMember>(`/spaces/${spaceId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateMember: (spaceId: string, userId: string, data: { spaceRole: SpaceRole }) =>
    apiFetch<SpaceMember>(`/spaces/${spaceId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  removeMember: (spaceId: string, userId: string) =>
    apiFetch<void>(`/spaces/${spaceId}/members/${userId}`, { method: "DELETE" }),

  // Role grants
  listRoleGrants: (spaceId: string) =>
    apiFetch<SpaceRoleGrant[]>(`/spaces/${spaceId}/role-grants`),

  addRoleGrant: (spaceId: string, data: { systemRoleId: string; spaceRole: SpaceRole }) =>
    apiFetch<SpaceRoleGrant>(`/spaces/${spaceId}/role-grants`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRoleGrant: (spaceId: string, roleId: string, data: { spaceRole: SpaceRole }) =>
    apiFetch<SpaceRoleGrant>(`/spaces/${spaceId}/role-grants/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  removeRoleGrant: (spaceId: string, roleId: string) =>
    apiFetch<void>(`/spaces/${spaceId}/role-grants/${roleId}`, { method: "DELETE" }),
};

// Re-export for convenience
export type { ListQuery, PaginatedResult };
