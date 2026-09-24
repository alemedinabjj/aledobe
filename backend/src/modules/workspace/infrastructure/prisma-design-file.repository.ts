import { Injectable } from "@nestjs/common"
import { Prisma, type File as FileRecord } from "../../../shared/infrastructure/prisma/client"
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service"
import { DesignFile } from "../domain/design-file.entity"
import { DesignFileRepository } from "../domain/design-file.repository"

const toDomain = (r: Omit<FileRecord, "document"> & { document?: Prisma.JsonValue | null }) =>
  DesignFile.restore(r.id, {
    name: r.name,
    projectId: r.projectId,
    document: r.document ?? null,
    thumbnail: r.thumbnail,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })

const META = { id: true, name: true, projectId: true, thumbnail: true, createdAt: true, updatedAt: true } as const

@Injectable()
export class PrismaDesignFileRepository extends DesignFileRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async findById(id: string) {
    const r = await this.prisma.file.findUnique({ where: { id } })
    return r ? toDomain(r) : null
  }

  async listByProject(projectId: string) {
    const rows = await this.prisma.file.findMany({ where: { projectId }, orderBy: { updatedAt: "desc" }, select: META })
    return rows.map(toDomain)
  }

  async listRecentByOwner(ownerId: string, limit: number) {
    const rows = await this.prisma.file.findMany({
      where: { project: { ownerId } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: META,
    })
    return rows.map(toDomain)
  }

  async save(file: DesignFile) {
    const { id, name, projectId, document, thumbnail, createdAt } = file.toSnapshot()
    const json = document === null ? Prisma.JsonNull : (document as Prisma.InputJsonValue)
    await this.prisma.file.upsert({
      where: { id },
      create: { id, name, projectId, document: json, thumbnail, createdAt },
      update: { name, document: json, thumbnail },
    })
  }

  async delete(id: string) {
    await this.prisma.file.delete({ where: { id } })
  }
}
