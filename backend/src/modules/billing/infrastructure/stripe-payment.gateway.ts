import { Injectable } from "@nestjs/common"
import Stripe from "stripe"
import { env } from "../../../config/env"
import { ValidationError } from "../../../shared/domain/errors"
import { BillingEvent, PaymentGateway } from "../domain/payment-gateway.port"

const ACTIVE: Stripe.Subscription.Status[] = ["active", "trialing"]

const idOf = (value: string | { id: string } | null) => (typeof value === "string" ? value : (value?.id ?? ""))

@Injectable()
export class StripePaymentGateway extends PaymentGateway {
  private readonly stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null

  get enabled() {
    return !!this.stripe && !!env.stripe.pricePro
  }

  private client() {
    if (!this.stripe) throw new ValidationError("Stripe is not configured")
    return this.stripe
  }

  async createCustomer(input: { email: string; name: string; userId: string }) {
    const customer = await this.client().customers.create({
      email: input.email,
      name: input.name,
      metadata: { userId: input.userId },
    })
    return customer.id
  }

  async createCheckout(input: { customerId: string; userId: string; successUrl: string; cancelUrl: string }) {
    const session = await this.client().checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      client_reference_id: input.userId,
      line_items: [{ price: env.stripe.pricePro, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    })
    if (!session.url) throw new ValidationError("Stripe did not return a checkout URL")
    return session.url
  }

  async createPortal(input: { customerId: string; returnUrl: string }) {
    const session = await this.client().billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    })
    return session.url
  }

  async parseEvent(payload: Buffer, signature: string): Promise<BillingEvent> {
    let event: Stripe.Event
    try {
      event = this.client().webhooks.constructEvent(payload, signature, env.stripe.webhookSecret)
    } catch {
      throw new ValidationError("Invalid webhook signature")
    }
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object
        if (s.mode !== "subscription" || !s.subscription) return { type: "ignored" }
        return { type: "subscription.activated", customerId: idOf(s.customer), subscriptionId: idOf(s.subscription) }
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object
        return {
          type: ACTIVE.includes(sub.status) ? "subscription.activated" : "subscription.canceled",
          customerId: idOf(sub.customer),
          subscriptionId: sub.id,
        }
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object
        return { type: "subscription.canceled", customerId: idOf(sub.customer), subscriptionId: sub.id }
      }
      default:
        return { type: "ignored" }
    }
  }
}
