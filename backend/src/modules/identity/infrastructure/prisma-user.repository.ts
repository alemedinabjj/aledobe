import { Injectable } from "@nestjs/common"
import type { User as UserRecord } from "../../../shared/infrastructure/prisma/client"
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service"
import type { OAuthProvider } from "../domain/oauth-identity"
import { User } from "../domain/user.entity"
import { UserRepository } from "../domain/user.repository"

const toDomain = (r: UserRecord) =>
  User.restore(r.id, {
    email: r.email,
    name: r.name,
    avatarUrl: r.avatarUrl,
    plan: r.plan,
    stripeCustomerId: r.stripeCustomerId,
    stripeSubscriptionId: r.stripeSubscriptionId,
    sessionVersion: r.sessionVersion,
    createdAt: r.createdAt,
  })

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async findById(id: string) {
    const r = await this.prisma.user.findUnique({ where: { id } })
    return r ? toDomain(r) : null
  }

  async findByEmail(email: string) {
    const r = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    return r ? toDomain(r) : null
  }

  async findByAccount(provider: OAuthProvider, providerAccountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    })
    return account ? toDomain(account.user) : null
  }

  async findByStripeCustomer(customerId: string) {
    const r = await this.prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
    return r ? toDomain(r) : null
  }

  async save(user: User) {
    const { id, ...data } = user.toSnapshot()
    await this.prisma.user.upsert({ where: { id }, create: { id, ...data }, update: data })
  }

  async linkAccount(userId: string, provider: OAuthProvider, providerAccountId: string) {
    await this.prisma.account.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { userId, provider, providerAccountId },
      update: { userId },
    })
  }
}
