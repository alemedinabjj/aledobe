import { Module } from "@nestjs/common"
import { IdentityModule } from "../identity/identity.module"
import {
  CreateFileUseCase,
  DeleteFileUseCase,
  DuplicateFileUseCase,
  GetFileUseCase,
  ListProjectFilesUseCase,
  ListRecentFilesUseCase,
  UpdateFileUseCase,
} from "./application/file.use-cases"
import { AccountPlanReader } from "./application/ports"
import {
  CreateProjectUseCase,
  DeleteProjectUseCase,
  ListProjectsUseCase,
  UpdateProjectUseCase,
} from "./application/project.use-cases"
import { WorkspaceAccess } from "./application/workspace-access.service"
import { DesignFileRepository } from "./domain/design-file.repository"
import { ProjectRepository } from "./domain/project.repository"
import { IdentityPlanReader } from "./infrastructure/identity-plan.reader"
import { PrismaDesignFileRepository } from "./infrastructure/prisma-design-file.repository"
import { PrismaProjectRepository } from "./infrastructure/prisma-project.repository"
import { FilesController } from "./presentation/files.controller"
import { ProjectsController } from "./presentation/projects.controller"

@Module({
  imports: [IdentityModule],
  controllers: [ProjectsController, FilesController],
  providers: [
    { provide: ProjectRepository, useClass: PrismaProjectRepository },
    { provide: DesignFileRepository, useClass: PrismaDesignFileRepository },
    { provide: AccountPlanReader, useClass: IdentityPlanReader },
    WorkspaceAccess,
    ListProjectsUseCase,
    CreateProjectUseCase,
    UpdateProjectUseCase,
    DeleteProjectUseCase,
    ListProjectFilesUseCase,
    ListRecentFilesUseCase,
    CreateFileUseCase,
    GetFileUseCase,
    UpdateFileUseCase,
    DuplicateFileUseCase,
    DeleteFileUseCase,
  ],
})
export class WorkspaceModule {}
