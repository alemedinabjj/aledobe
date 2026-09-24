import { Injectable } from "@nestjs/common"
import { UserRepository } from "../domain/user.repository"

@Injectable()
export class SignOutEverywhereUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId)
    if (!user) return
    user.revokeSessions()
    await this.users.save(user)
  }
}
