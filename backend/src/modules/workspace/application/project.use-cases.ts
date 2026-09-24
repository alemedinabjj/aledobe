import { Injectable } from "@nestjs/common"
import { Project } from "../domain/project.entity"
import { PlanPolicy } from "../domain/plan-policy"
import { ProjectRepository } from "../domain/project.repository"
import { AccountPlanReader } from "./ports"
import { WorkspaceAccess } from "./workspace-access.service"

@Injectable()
export class ListProjectsUseCase {
  constructor(private readonly projects: ProjectRepository) {}

  execute(userId: string) {
    return this.projects.listByOwner(userId)
  }
}

@Injectable()
export class CreateProjectUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly plans: AccountPlanReader,
  ) {}

  async execute(userId: string, name: string) {
    const [plan, count] = await Promise.all([this.plans.planOf(userId), this.projects.countByOwner(userId)])
    PlanPolicy.assertCanCreateProject(plan, count)
    const project = Project.create({ name, ownerId: userId })
    await this.projects.save(project)
    return { project, fileCount: 0 }
  }
}

@Injectable()
export class UpdateProjectUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly access: WorkspaceAccess,
  ) {}

  async execute(userId: string, projectId: string, changes: { name?: string; color?: string }) {
    const project = await this.access.project(userId, projectId)
    if (changes.name !== undefined) project.rename(changes.name)
    if (changes.color !== undefined) project.recolor(changes.color)
    await this.projects.save(project)
    const summary = (await this.projects.listByOwner(userId)).find((s) => s.project.id === project.id)
    return summary ?? { project, fileCount: 0 }
  }
}

@Injectable()
export class DeleteProjectUseCase {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly access: WorkspaceAccess,
  ) {}

  async execute(userId: string, projectId: string) {
    await this.access.project(userId, projectId)
    await this.projects.delete(projectId)
  }
}
