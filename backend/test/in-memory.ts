import type { OAuthProvider } from "../src/modules/identity/domain/oauth-identity"
import type { User } from "../src/modules/identity/domain/user.entity"
import { UserRepository } from "../src/modules/identity/domain/user.repository"
import { SessionTokenService } from "../src/modules/identity/application/session-token.port"
import type { DesignFile } from "../src/modules/workspace/domain/design-file.entity"
import { DesignFileRepository } from "../src/modules/workspace/domain/design-file.repository"
import type { Project } from "../src/modules/workspace/domain/project.entity"
import { ProjectRepository } from "../src/modules/workspace/domain/project.repository"
import { AccountPlanReader } from "../src/modules/workspace/application/ports"

export class InMemoryUsers extends UserRepository {
  users = new Map<string, User>()
  accounts = new Map<string, string>()

  async findById(id: string) {
    return this.users.get(id) ?? null
  }
  async findByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email.toLowerCase()) ?? null
  }
  async findByAccount(provider: OAuthProvider, accountId: string) {
    const id = this.accounts.get(`${provider}:${accountId}`)
    return id ? (this.users.get(id) ?? null) : null
  }
  async findByStripeCustomer(customerId: string) {
    return [...this.users.values()].find((u) => u.stripeCustomerId === customerId) ?? null
  }
  async save(user: User) {
    this.users.set(user.id, user)
  }
  async linkAccount(userId: string, provider: OAuthProvider, accountId: string) {
    this.accounts.set(`${provider}:${accountId}`, userId)
  }
}

export class FakeTokens extends SessionTokenService {
  async sign(payload: { sub: string; ver: number }) {
    return `token:${payload.sub}:${payload.ver}`
  }
  async verify(token: string) {
    const [prefix, sub, ver] = token.split(":")
    return prefix === "token" && sub ? { sub, ver: Number(ver) } : null
  }
}

export class InMemoryProjects extends ProjectRepository {
  items = new Map<string, Project>()
  files?: InMemoryFiles

  async findById(id: string) {
    return this.items.get(id) ?? null
  }
  async listByOwner(ownerId: string) {
    return [...this.items.values()]
      .filter((p) => p.ownerId === ownerId)
      .map((project) => ({
        project,
        fileCount: this.files ? [...this.files.items.values()].filter((f) => f.projectId === project.id).length : 0,
      }))
  }
  async countByOwner(ownerId: string) {
    return [...this.items.values()].filter((p) => p.ownerId === ownerId).length
  }
  async save(project: Project) {
    this.items.set(project.id, project)
  }
  async delete(id: string) {
    this.items.delete(id)
  }
  async touch() {}
}

export class InMemoryFiles extends DesignFileRepository {
  items = new Map<string, DesignFile>()

  constructor(private readonly projects: InMemoryProjects) {
    super()
    projects.files = this
  }
  async findById(id: string) {
    return this.items.get(id) ?? null
  }
  async listByProject(projectId: string) {
    return [...this.items.values()].filter((f) => f.projectId === projectId)
  }
  async listRecentByOwner(ownerId: string, limit: number) {
    return [...this.items.values()]
      .filter((f) => this.projects.items.get(f.projectId)?.ownerId === ownerId)
      .slice(0, limit)
  }
  async save(file: DesignFile) {
    this.items.set(file.id, file)
  }
  async delete(id: string) {
    this.items.delete(id)
  }
}

export class FixedPlan extends AccountPlanReader {
  constructor(public plan: "free" | "pro" = "free") {
    super()
  }
  async planOf() {
    return this.plan
  }
}
