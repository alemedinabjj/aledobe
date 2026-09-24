export type Plan = "free" | "pro"

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  plan: Plan
}

export interface Project {
  id: string
  name: string
  color: string
  fileCount: number
  createdAt: string
  updatedAt: string
}

export interface FileMeta {
  id: string
  projectId: string
  name: string
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

export interface DesignFile extends FileMeta {
  document: unknown
}

export type Provider = "google" | "github" | "linkedin"
