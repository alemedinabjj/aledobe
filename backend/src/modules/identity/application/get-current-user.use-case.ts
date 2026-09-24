import { Injectable } from "@nestjs/common"
import { NotFoundError } from "../../../shared/domain/errors"
import { UserRepository } from "../domain/user.repository"

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId)
    if (!user) throw new NotFoundError("User")
    return user
  }
}
