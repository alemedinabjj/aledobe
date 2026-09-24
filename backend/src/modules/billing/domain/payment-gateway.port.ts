export type BillingEvent =
  | { type: "subscription.activated"; customerId: string; subscriptionId: string }
  | { type: "subscription.canceled"; customerId: string; subscriptionId: string }
  | { type: "ignored" }

export abstract class PaymentGateway {
  abstract readonly enabled: boolean
  abstract createCustomer(input: { email: string; name: string; userId: string }): Promise<string>
  abstract createCheckout(input: {
    customerId: string
    userId: string
    successUrl: string
    cancelUrl: string
  }): Promise<string>
  abstract createPortal(input: { customerId: string; returnUrl: string }): Promise<string>
  abstract parseEvent(payload: Buffer, signature: string): Promise<BillingEvent>
}
