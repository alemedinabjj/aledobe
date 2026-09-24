import { Injectable } from "@nestjs/common"
import { UserRepository } from "../domain/user.repository"
import { SessionTokenService } from "./session-token.port"

@Injectable()
export class AuthenticateSessionUseCase {
  constructor(
    private readonly tokens: SessionTokenService,
    private readonly users: UserRepository,
  ) {}

  async execute(token: string) {
    const payload = await this.tokens.verify(token)
    if (!payload) return null
    const user = await this.users.findById(payload.sub)
    if (!user || user.sessionVersion !== payload.ver) return null
    return user
  }
}
