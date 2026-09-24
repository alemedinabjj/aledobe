import { Injectable } from "@nestjs/common"
import { NotFoundError } from "../../../shared/domain/errors"
import { UserRepository } from "../../identity/domain/user.repository"
import { AccountPlanReader } from "../application/ports"

@Injectable()
export class IdentityPlanReader extends AccountPlanReader {
  constructor(private readonly users: UserRepository) {
    super()
  }

  async planOf(userId: string) {
    const user = await this.users.findById(userId)
    if (!user) throw new NotFoundError("User")
    return user.plan
  }
}
