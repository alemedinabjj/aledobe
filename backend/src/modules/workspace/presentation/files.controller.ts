import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common"
import { CurrentUserId } from "../../identity/presentation/current-user.decorator"
import { SessionGuard } from "../../identity/presentation/session.guard"
import {
  DeleteFileUseCase,
  DuplicateFileUseCase,
  GetFileUseCase,
  ListRecentFilesUseCase,
  UpdateFileUseCase,
} from "../application/file.use-cases"
import { toFileMetaView, toFileView } from "../application/views"
import { UpdateFileDto } from "./dto"

@Controller("files")
@UseGuards(SessionGuard)
export class FilesController {
  constructor(
    private readonly recent: ListRecentFilesUseCase,
    private readonly getFile: GetFileUseCase,
    private readonly updateFile: UpdateFileUseCase,
    private readonly duplicateFile: DuplicateFileUseCase,
    private readonly deleteFile: DeleteFileUseCase,
  ) {}

  @Get()
  async all(@CurrentUserId() userId: string) {
    return (await this.recent.execute(userId, 200)).map(toFileMetaView)
  }

  @Get("recent")
  async recentFiles(@CurrentUserId() userId: string) {
    return (await this.recent.execute(userId)).map(toFileMetaView)
  }

  @Get(":id")
  async one(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return toFileView(await this.getFile.execute(userId, id))
  }

  @Patch(":id")
  async update(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateFileDto) {
    return toFileMetaView(await this.updateFile.execute(userId, id, dto))
  }

  @Post(":id/duplicate")
  async duplicate(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return toFileMetaView(await this.duplicateFile.execute(userId, id))
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUserId() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    await this.deleteFile.execute(userId, id)
  }
}
