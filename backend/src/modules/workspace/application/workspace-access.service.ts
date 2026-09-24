import { Injectable } from "@nestjs/common"
import { NotFoundError } from "../../../shared/domain/errors"
import { DesignFileRepository } from "../domain/design-file.repository"
import { ProjectRepository } from "../domain/project.repository"

@Injectable()
export class WorkspaceAccess {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly files: DesignFileRepository,
  ) {}

  async project(userId: string, projectId: string) {
    const project = await this.projects.findById(projectId)
    if (!project || !project.isOwnedBy(userId)) throw new NotFoundError("Project")
    return project
  }

  async file(userId: string, fileId: string) {
    const file = await this.files.findById(fileId)
    if (!file) throw new NotFoundError("File")
    const project = await this.projects.findById(file.projectId)
    if (!project || !project.isOwnedBy(userId)) throw new NotFoundError("File")
    return file
  }
}
