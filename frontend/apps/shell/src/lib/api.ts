import type { DesignFile, FileMeta, Plan, Project, Provider, User } from "./types"

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? ""

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.message ?? message
    } catch {
      message = res.statusText
    }
    throw new ApiError(res.status, Array.isArray(message) ? message.join(", ") : message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface AuthOptions {
  providers: Provider[]
  devLogin: boolean
}

export interface Backend {
  me(): Promise<User | null>
  logout(): Promise<void>
  loginUrl(provider: Provider): string
  authOptions(): Promise<AuthOptions>
  devLogin(name: string, email: string): Promise<User>
  listProjects(): Promise<Project[]>
  createProject(name: string): Promise<Project>
  updateProject(id: string, data: Partial<Pick<Project, "name" | "color">>): Promise<Project>
  deleteProject(id: string): Promise<void>
  listFiles(projectId?: string): Promise<FileMeta[]>
  recentFiles(): Promise<FileMeta[]>
  createFile(projectId: string, name: string, document?: unknown): Promise<FileMeta>
  getFile(id: string): Promise<DesignFile>
  updateFile(id: string, data: Partial<Pick<DesignFile, "name" | "document" | "thumbnail">>): Promise<FileMeta>
  deleteFile(id: string): Promise<void>
  duplicateFile(id: string): Promise<FileMeta>
  checkout(plan: Plan): Promise<{ url: string }>
  billingPortal(): Promise<{ url: string }>
}

const remote: Backend = {
  async me() {
    try {
      return await request<User>("/auth/me")
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null
      throw e
    }
  },
  logout: () => request("/auth/logout", { method: "POST" }),
  loginUrl: (provider) => `${API_URL}/auth/${provider}`,
  authOptions: () => request("/auth/providers"),
  devLogin: (name, email) => request("/auth/dev-login", { method: "POST", body: JSON.stringify({ name, email }) }),
  listProjects: () => request("/projects"),
  createProject: (name) => request("/projects", { method: "POST", body: JSON.stringify({ name }) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),
  listFiles: (projectId) => request(projectId ? `/projects/${projectId}/files` : "/files"),
  recentFiles: () => request("/files/recent"),
  createFile: (projectId, name, document) =>
    request(`/projects/${projectId}/files`, { method: "POST", body: JSON.stringify({ name, document }) }),
  getFile: (id) => request(`/files/${id}`),
  updateFile: (id, data) => request(`/files/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteFile: (id) => request(`/files/${id}`, { method: "DELETE" }),
  duplicateFile: (id) => request(`/files/${id}/duplicate`, { method: "POST" }),
  checkout: (plan) => request("/billing/checkout", { method: "POST", body: JSON.stringify({ plan }) }),
  billingPortal: () => request("/billing/portal", { method: "POST" }),
}

export const api = remote

export async function apiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { credentials: "include" })
    return res.ok
  } catch {
    return false
  }
}
