import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import type { AuthenticatedRequest } from "./session.guard"

export const CurrentUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthenticatedRequest>().userId,
)
