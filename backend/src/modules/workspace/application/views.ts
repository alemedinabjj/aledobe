import type { DesignFile } from "../domain/design-file.entity"
import type { ProjectSummary } from "../domain/project.repository"

export const toProjectView = ({ project, fileCount }: ProjectSummary) => ({
  id: project.id,
  name: project.name,
  color: project.color,
  fileCount,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
})

export const toFileMetaView = (file: DesignFile) => ({
  id: file.id,
  projectId: file.projectId,
  name: file.name,
  thumbnail: file.thumbnail,
  createdAt: file.createdAt.toISOString(),
  updatedAt: file.updatedAt.toISOString(),
})

export const toFileView = (file: DesignFile) => ({ ...toFileMetaView(file), document: file.document })
