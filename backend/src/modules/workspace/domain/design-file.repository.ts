import type { DesignFile } from "./design-file.entity"

export abstract class DesignFileRepository {
  abstract findById(id: string): Promise<DesignFile | null>
  abstract listByProject(projectId: string): Promise<DesignFile[]>
  abstract listRecentByOwner(ownerId: string, limit: number): Promise<DesignFile[]>
  abstract save(file: DesignFile): Promise<void>
  abstract delete(id: string): Promise<void>
}
