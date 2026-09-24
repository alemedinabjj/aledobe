import { Injectable } from "@nestjs/common"
import { ForbiddenError } from "../../../shared/domain/errors"
import type { OAuthIdentity } from "../domain/oauth-identity"
import { User } from "../domain/user.entity"
import { UserRepository } from "../domain/user.repository"
import { SessionTokenService } from "./session-token.port"

@Injectable()
export class SignInWithOAuthUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: SessionTokenService,
  ) {}

  async execute(identity: OAuthIdentity) {
    let user = await this.users.findByAccount(identity.provider, identity.providerAccountId)
    if (!user) {
      if (!identity.emailVerified) throw new ForbiddenError("Your provider has not verified this email address")
      user = await this.users.findByEmail(identity.email)
      if (!user) user = User.create(identity)
      else user.updateProfile(identity)
      await this.users.save(user)
      await this.users.linkAccount(user.id, identity.provider, identity.providerAccountId)
    } else {
      user.updateProfile(identity)
      await this.users.save(user)
    }
    const token = await this.tokens.sign({ sub: user.id, ver: user.sessionVersion })
    return { user, token }
  }
}
