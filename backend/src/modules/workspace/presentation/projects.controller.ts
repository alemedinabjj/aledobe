import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common"
import { CurrentUserId } from "../../identity/presentation/current-user.decorator"
import { SessionGuard } from "../../identity/presentation/session.guard"
import { CreateFileUseCase, ListProjectFilesUseCase } from "../application/file.use-cases"
import {
  CreateProjectUseCase,
  DeleteProjectUseCase,
  ListProjectsUseCase,
  UpdateProjectUseCase,
} from "../application/project.use-cases"
import { toFileMetaView, toProjectView } from "../application/views"
import { CreateFileDto, CreateProjectDto, UpdateProjectDto } from "./dto"

@Controller("projects")
@UseGuards(SessionGuard)
export class ProjectsController {
  constructor(
    private readonly listProjects: ListProjectsUseCase,
    private readonly createProject: CreateProjectUseCase,
    private readonly updateProject: UpdateProjectUseCase,
    private readonly deleteProject: DeleteProjectUseCase,
    private readonly listFiles: ListProjectFilesUseCase,
    private readonly createFile: CreateFileUseCase,
  ) {}

  @Get()
  async list(@CurrentUserId() userId: string) {
    return (await this.listProjects.execute(userId)).map(toProjectView)
  }

  @Post()
  async create(@CurrentUserId() userId: string, @Body() dto: CreateProjectDto) {
    return toProjectView(await this.createProject.execute(userId, dto.name))
  }

  @Patch(":id")
  async update(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) {
    return toProjectView(await this.updateProject.execute(userId, id, dto))
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    await this.deleteProject.execute(userId, id)
  }

  @Get(":id/files")
  async files(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return (await this.listFiles.execute(userId, id)).map(toFileMetaView)
  }

  @Post(":id/files")
  async addFile(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateFileDto) {
    return toFileMetaView(
      await this.createFile.execute(userId, id, { name: dto.name, document: dto.document ?? undefined }),
    )
  }
}
