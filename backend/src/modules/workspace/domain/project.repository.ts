import type { Project } from "./project.entity"

export interface ProjectSummary {
  project: Project
  fileCount: number
}

export abstract class ProjectRepository {
  abstract findById(id: string): Promise<Project | null>
  abstract listByOwner(ownerId: string): Promise<ProjectSummary[]>
  abstract countByOwner(ownerId: string): Promise<number>
  abstract save(project: Project): Promise<void>
  abstract delete(id: string): Promise<void>
  abstract touch(id: string): Promise<void>
}
