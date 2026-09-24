import { Injectable } from "@nestjs/common"
import { DesignFile } from "../domain/design-file.entity"
import { DesignFileRepository } from "../domain/design-file.repository"
import { ProjectRepository } from "../domain/project.repository"
import { WorkspaceAccess } from "./workspace-access.service"

@Injectable()
export class ListProjectFilesUseCase {
  constructor(
    private readonly files: DesignFileRepository,
    private readonly access: WorkspaceAccess,
  ) {}

  async execute(userId: string, projectId: string) {
    await this.access.project(userId, projectId)
    return this.files.listByProject(projectId)
  }
}

@Injectable()
export class ListRecentFilesUseCase {
  constructor(private readonly files: DesignFileRepository) {}

  execute(userId: string, limit = 24) {
    return this.files.listRecentByOwner(userId, limit)
  }
}

@Injectable()
export class CreateFileUseCase {
  constructor(
    private readonly files: DesignFileRepository,
    private readonly projects: ProjectRepository,
    private readonly access: WorkspaceAccess,
  ) {}

  async execute(userId: string, projectId: string, input: { name: string; document?: unknown }) {
    await this.access.project(userId, projectId)
    const file = DesignFile.create({ ...input, projectId })
    await this.files.save(file)
    await this.projects.touch(projectId)
    return file
  }
}

@Injectable()
export class GetFileUseCase {
  constructor(private readonly access: WorkspaceAccess) {}

  execute(userId: string, fileId: string) {
    return this.access.file(userId, fileId)
  }
}

@Injectable()
export class UpdateFileUseCase {
  constructor(
    private readonly files: DesignFileRepository,
    private readonly projects: ProjectRepository,
    private readonly access: WorkspaceAccess,
  ) {}

  async execute(
    userId: string,
    fileId: string,
    changes: { name?: string; document?: unknown; thumbnail?: string | null },
  ) {
    const file = await this.access.file(userId, fileId)
    if (changes.name !== undefined) file.rename(changes.name)
    if (changes.document !== undefined) file.replaceDocument(changes.document)
    if (changes.thumbnail !== undefined) file.setThumbnail(changes.thumbnail)
    await this.files.save(file)
    await this.projects.touch(file.projectId)
    return file
  }
}

@Injectable()
export class DuplicateFileUseCase {
  constructor(
    private readonly files: DesignFileRepository,
    private readonly access: WorkspaceAccess,
  ) {}

  async execute(userId: string, fileId: string) {
    const file = await this.access.file(userId, fileId)
    const copy = file.duplicate()
    await this.files.save(copy)
    return copy
  }
}

@Injectable()
export class DeleteFileUseCase {
  constructor(
    private readonly files: DesignFileRepository,
    private readonly access: WorkspaceAccess,
  ) {}

  async execute(userId: string, fileId: string) {
    await this.access.file(userId, fileId)
    await this.files.delete(fileId)
  }
}
