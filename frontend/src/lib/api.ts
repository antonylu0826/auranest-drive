import { getToken } from "./auth";
import type { RoleRef } from "./roles-api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
}

export function toQueryString(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  role?: RoleRef & { permissionPolicy?: string };
  isActive: boolean;
  createdAt: string;
}

export const usersApi = {
  list: (query?: ListQuery) =>
    apiFetch<PaginatedResult<User>>(`/users${toQueryString({ ...query })}`),
  get: (id: string) => apiFetch<User>(`/users/${id}`),
  create: (data: { email: string; password: string; name?: string; roleId?: string }) =>
    apiFetch<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    apiFetch<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateRole: (id: string, roleId: string) =>
    apiFetch<User>(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ roleId }) }),
  remove: (id: string) => apiFetch<void>(`/users/${id}`, { method: "DELETE" }),
};

export interface DriveFolder {
  id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  isTrashed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  ownerId: string;
  folderId: string | null;
  isTrashed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SharePermission = "VIEW" | "EDIT";

export interface FileShare {
  id: string;
  permission: SharePermission;
  createdAt: string;
  file: DriveFile;
}

export interface FolderListQuery extends ListQuery {
  parentId?: string;
  trashed?: boolean;
}

export interface FileListQuery extends ListQuery {
  folderId?: string;
  trashed?: boolean;
}

export const foldersApi = {
  list: (query?: FolderListQuery) =>
    apiFetch<PaginatedResult<DriveFolder>>(`/drive/folders${toQueryString({ ...query })}`),
  get: (id: string) => apiFetch<DriveFolder>(`/drive/folders/${id}`),
  create: (data: { name: string; parentId?: string }) =>
    apiFetch<DriveFolder>("/drive/folders", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; parentId?: string }) =>
    apiFetch<DriveFolder>(`/drive/folders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  trash: (id: string) =>
    apiFetch<DriveFolder>(`/drive/folders/${id}/trash`, { method: "PATCH" }),
  restore: (id: string) =>
    apiFetch<DriveFolder>(`/drive/folders/${id}/restore`, { method: "PATCH" }),
  remove: (id: string) => apiFetch<void>(`/drive/folders/${id}`, { method: "DELETE" }),
  emptyTrash: () => apiFetch<{ count: number }>("/drive/folders/trash/empty", { method: "POST" }),
};

export interface UploadProgress {
  taskId: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
}

export function uploadFile(
  file: File,
  folderId: string | undefined,
  onProgress: (pct: number) => void,
): Promise<DriveFile> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folderId", folderId);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as DriveFile);
      } else {
        const msg = (() => { try { return (JSON.parse(xhr.responseText) as { message?: string }).message; } catch { return undefined; } })();
        reject(new Error(msg ?? `HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.open("POST", `${API}/drive/files/upload`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}

export const wopiApi = {
  getEditorUrl: (fileId: string) =>
    apiFetch<{ editorUrl: string; accessToken: string }>(`/wopi/editor-url/${fileId}`),
};

// Keep in sync with backend/src/wopi/wopi.controller.ts COLLABORA_EXTENSIONS
export const COLLABORA_EXTENSIONS = new Set([
  "doc", "docx", "docm", "dot", "dotx", "dotm", "odt", "ott", "rtf", "fodt",
  "xls", "xlsx", "xlsm", "xlt", "xltx", "ods", "ots", "csv", "fods",
  "ppt", "pptx", "pptm", "pps", "ppsx", "odp", "otp", "fodp", "odg",
]);

export const filesApi = {
  list: (query?: FileListQuery) =>
    apiFetch<PaginatedResult<DriveFile>>(`/drive/files${toQueryString({ ...query })}`),
  sharedWithMe: (query?: ListQuery) =>
    apiFetch<PaginatedResult<FileShare>>(`/drive/files/shared-with-me${toQueryString({ ...query })}`),
  get: (id: string) => apiFetch<DriveFile>(`/drive/files/${id}`),
  getDownloadUrl: (id: string) =>
    apiFetch<{ url: string }>(`/drive/files/${id}/download`),
  update: (id: string, data: { name?: string; folderId?: string }) =>
    apiFetch<DriveFile>(`/drive/files/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  trash: (id: string) =>
    apiFetch<DriveFile>(`/drive/files/${id}/trash`, { method: "PATCH" }),
  restore: (id: string) =>
    apiFetch<DriveFile>(`/drive/files/${id}/restore`, { method: "PATCH" }),
  remove: (id: string) => apiFetch<void>(`/drive/files/${id}`, { method: "DELETE" }),
  share: (id: string, data: { sharedWithId: string; permission: SharePermission }) =>
    apiFetch<FileShare>(`/drive/files/${id}/shares`, { method: "POST", body: JSON.stringify(data) }),
  unshare: (id: string, userId: string) =>
    apiFetch<void>(`/drive/files/${id}/shares/${userId}`, { method: "DELETE" }),
  emptyTrash: () => apiFetch<{ count: number }>("/drive/files/trash/empty", { method: "POST" }),
};
