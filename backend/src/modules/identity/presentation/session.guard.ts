import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import type { Request } from "express"
import { AuthenticateSessionUseCase } from "../application/authenticate-session.use-case"
import { SESSION_COOKIE } from "./session.cookie"

export interface AuthenticatedRequest extends Request {
  userId: string
}

export const readSessionToken = (req: Request) =>
  (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1]

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authenticate: AuthenticateSessionUseCase) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = readSessionToken(req)
    if (!token || token.length > 2048) throw new UnauthorizedException()
    const user = await this.authenticate.execute(token)
    if (!user) throw new UnauthorizedException()
    req.userId = user.id
    return true
  }
}
