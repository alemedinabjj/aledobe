import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common"
import type { Request } from "express"
import { env } from "../../config/env"

const SAFE = new Set(["GET", "HEAD", "OPTIONS"])
const EXEMPT = ["/api/billing/webhook"]

@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>()
    if (SAFE.has(req.method) || EXEMPT.includes(req.path)) return true
    const origin = req.headers.origin
    if (origin) {
      if (!env.allowedOrigins.includes(origin.replace(/\/$/, ""))) throw new ForbiddenException("Origin not allowed")
      return true
    }
    if (req.headers["sec-fetch-site"] === "cross-site") throw new ForbiddenException("Cross-site request blocked")
    return true
  }
}
