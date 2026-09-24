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

export interface Backend {
  mode: "remote" | "local"
  me(): Promise<User | null>
  logout(): Promise<void>
  loginUrl(provider: Provider): string
  devLogin?(name: string, email: string): Promise<User>
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
  mode: "remote",
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

const KEY = "aledobe:local-db"
const COLORS = ["#A855F7", "#E879F9", "#22D3EE", "#10B981", "#F59E0B", "#F43F5E", "#6366F1"]

interface LocalDb {
  user: User | null
  projects: Project[]
  files: DesignFile[]
}

const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()

function readDb(): LocalDb {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    return { user: null, projects: [], files: [] }
  }
  return { user: null, projects: [], files: [] }
}

function writeDb(db: LocalDb) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    const slim = { ...db, files: db.files.map((f) => ({ ...f, thumbnail: null })) }
    localStorage.setItem(KEY, JSON.stringify(slim))
  }
}

const meta = ({ document: _document, ...rest }: DesignFile): FileMeta => rest

function withCounts(db: LocalDb): Project[] {
  return db.projects.map((p) => ({ ...p, fileCount: db.files.filter((f) => f.projectId === p.id).length }))
}

const local: Backend = {
  mode: "local",
  async me() {
    return readDb().user
  },
  async logout() {
    const db = readDb()
    db.user = null
    writeDb(db)
  },
  loginUrl: () => "",
  async devLogin(name, email) {
    const db = readDb()
    db.user = { id: id(), name, email, avatarUrl: null, plan: "free" }
    if (!db.projects.length) {
      db.projects.push({
        id: id(),
        name: "My first project",
        color: COLORS[0],
        fileCount: 0,
        createdAt: now(),
        updatedAt: now(),
      })
    }
    writeDb(db)
    return db.user
  },
  async listProjects() {
    return withCounts(readDb()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  async createProject(name) {
    const db = readDb()
    const p: Project = {
      id: id(),
      name,
      color: COLORS[db.projects.length % COLORS.length],
      fileCount: 0,
      createdAt: now(),
      updatedAt: now(),
    }
    db.projects.push(p)
    writeDb(db)
    return p
  },
  async updateProject(pid, data) {
    const db = readDb()
    const p = db.projects.find((x) => x.id === pid)
    if (!p) throw new ApiError(404, "Project not found")
    Object.assign(p, data, { updatedAt: now() })
    writeDb(db)
    return p
  },
  async deleteProject(pid) {
    const db = readDb()
    db.projects = db.projects.filter((p) => p.id !== pid)
    db.files = db.files.filter((f) => f.projectId !== pid)
    writeDb(db)
  },
  async listFiles(projectId) {
    return readDb()
      .files.filter((f) => !projectId || f.projectId === projectId)
      .map(meta)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  async recentFiles() {
    return (await local.listFiles()).slice(0, 12)
  },
  async createFile(projectId, name, document) {
    const db = readDb()
    const f: DesignFile = {
      id: id(),
      projectId,
      name,
      thumbnail: null,
      document: document ?? null,
      createdAt: now(),
      updatedAt: now(),
    }
    db.files.push(f)
    const p = db.projects.find((x) => x.id === projectId)
    if (p) p.updatedAt = now()
    writeDb(db)
    return meta(f)
  },
  async getFile(fid) {
    const f = readDb().files.find((x) => x.id === fid)
    if (!f) throw new ApiError(404, "File not found")
    return f
  },
  async updateFile(fid, data) {
    const db = readDb()
    const f = db.files.find((x) => x.id === fid)
    if (!f) throw new ApiError(404, "File not found")
    Object.assign(f, data, { updatedAt: now() })
    writeDb(db)
    return meta(f)
  },
  async deleteFile(fid) {
    const db = readDb()
    db.files = db.files.filter((f) => f.id !== fid)
    writeDb(db)
  },
  async duplicateFile(fid) {
    const f = await local.getFile(fid)
    return local.createFile(f.projectId, `${f.name} (copy)`, structuredClone(f.document))
  },
  async checkout() {
    throw new ApiError(400, "Billing requires the Aledobe API to be running.")
  },
  async billingPortal() {
    throw new ApiError(400, "Billing requires the Aledobe API to be running.")
  },
}

let resolved: Backend | null = null

export async function backend(): Promise<Backend> {
  if (resolved) return resolved
  if (!API_URL) return (resolved = local)
  try {
    const res = await fetch(`${API_URL}/health`, { credentials: "include" })
    resolved = res.ok ? remote : local
  } catch {
    resolved = local
  }
  return resolved
}
