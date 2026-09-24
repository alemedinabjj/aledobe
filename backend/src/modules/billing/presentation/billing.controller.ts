import { Controller, Headers, HttpCode, Post, Req, UseGuards, type RawBodyRequest } from "@nestjs/common"
import type { Request } from "express"
import { ValidationError } from "../../../shared/domain/errors"
import { CurrentUserId } from "../../identity/presentation/current-user.decorator"
import { SessionGuard } from "../../identity/presentation/session.guard"
import {
  HandleBillingWebhookUseCase,
  OpenBillingPortalUseCase,
  StartCheckoutUseCase,
} from "../application/billing.use-cases"

@Controller("billing")
export class BillingController {
  constructor(
    private readonly checkout: StartCheckoutUseCase,
    private readonly portal: OpenBillingPortalUseCase,
    private readonly webhook: HandleBillingWebhookUseCase,
  ) {}

  @Post("checkout")
  @UseGuards(SessionGuard)
  startCheckout(@CurrentUserId() userId: string) {
    return this.checkout.execute(userId)
  }

  @Post("portal")
  @UseGuards(SessionGuard)
  openPortal(@CurrentUserId() userId: string) {
    return this.portal.execute(userId)
  }

  @Post("webhook")
  @HttpCode(200)
  async handle(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature?: string) {
    if (!req.rawBody || !signature) throw new ValidationError("Missing webhook payload or signature")
    await this.webhook.execute(req.rawBody, signature)
    return { received: true }
  }
}
