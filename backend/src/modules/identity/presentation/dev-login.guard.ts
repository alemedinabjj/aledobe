import { CanActivate, Injectable, NotFoundException } from "@nestjs/common"
import { env } from "../../../config/env"

@Injectable()
export class DevLoginEnabledGuard implements CanActivate {
  canActivate() {
    if (!env.devLogin) throw new NotFoundException()
    return true
  }
}
