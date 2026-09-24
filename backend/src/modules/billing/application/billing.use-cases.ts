import { Injectable } from "@nestjs/common"
import { env } from "../../../config/env"
import { ConfigurationError, NotFoundError, ValidationError } from "../../../shared/domain/errors"
import { UserRepository } from "../../identity/domain/user.repository"
import { PaymentGateway } from "../domain/payment-gateway.port"

@Injectable()
export class StartCheckoutUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly payments: PaymentGateway,
  ) {}

  async execute(userId: string) {
    if (!this.payments.enabled) throw new ConfigurationError("Billing is not configured on this server")
    const user = await this.users.findById(userId)
    if (!user) throw new NotFoundError("User")
    if (user.isPro) throw new ValidationError("You are already on the Pro plan")
    if (!user.stripeCustomerId) {
      user.linkBillingCustomer(
        await this.payments.createCustomer({ email: user.email, name: user.name, userId: user.id }),
      )
      await this.users.save(user)
    }
    const url = await this.payments.createCheckout({
      customerId: user.stripeCustomerId!,
      userId: user.id,
      successUrl: `${env.frontendUrl}/dashboard?billing=success`,
      cancelUrl: `${env.frontendUrl}/dashboard?billing=cancel`,
    })
    return { url }
  }
}

@Injectable()
export class OpenBillingPortalUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly payments: PaymentGateway,
  ) {}

  async execute(userId: string) {
    if (!this.payments.enabled) throw new ConfigurationError("Billing is not configured on this server")
    const user = await this.users.findById(userId)
    if (!user?.stripeCustomerId) throw new ValidationError("No billing account yet")
    return {
      url: await this.payments.createPortal({
        customerId: user.stripeCustomerId,
        returnUrl: `${env.frontendUrl}/dashboard`,
      }),
    }
  }
}

@Injectable()
export class HandleBillingWebhookUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly payments: PaymentGateway,
  ) {}

  async execute(payload: Buffer, signature: string) {
    const event = await this.payments.parseEvent(payload, signature)
    if (event.type === "ignored") return
    const user = await this.users.findByStripeCustomer(event.customerId)
    if (!user) return
    if (event.type === "subscription.activated") user.activatePro(event.subscriptionId)
    else if (user.stripeSubscriptionId === event.subscriptionId || !user.stripeSubscriptionId) user.downgradeToFree()
    await this.users.save(user)
  }
}
