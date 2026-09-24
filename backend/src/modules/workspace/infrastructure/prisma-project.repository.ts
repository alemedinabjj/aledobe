import { Injectable } from "@nestjs/common"
import type { Project as ProjectRecord } from "../../../shared/infrastructure/prisma/client"
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service"
import { Project } from "../domain/project.entity"
import { ProjectRepository } from "../domain/project.repository"

const toDomain = (r: ProjectRecord) =>
  Project.restore(r.id, {
    name: r.name,
    color: r.color,
    ownerId: r.ownerId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  })

@Injectable()
export class PrismaProjectRepository extends ProjectRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async findById(id: string) {
    const r = await this.prisma.project.findUnique({ where: { id } })
    return r ? toDomain(r) : null
  }

  async listByOwner(ownerId: string) {
    const rows = await this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { files: true } } },
    })
    return rows.map((r) => ({ project: toDomain(r), fileCount: r._count.files }))
  }

  countByOwner(ownerId: string) {
    return this.prisma.project.count({ where: { ownerId } })
  }

  async save(project: Project) {
    const { id, name, color, ownerId, createdAt } = project.toSnapshot()
    await this.prisma.project.upsert({
      where: { id },
      create: { id, name, color, ownerId, createdAt },
      update: { name, color },
    })
  }

  async delete(id: string) {
    await this.prisma.project.delete({ where: { id } })
  }

  async touch(id: string) {
    await this.prisma.project.update({ where: { id }, data: { updatedAt: new Date() } })
  }
}
