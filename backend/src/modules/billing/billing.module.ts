import { Module } from "@nestjs/common"
import { IdentityModule } from "../identity/identity.module"
import {
  HandleBillingWebhookUseCase,
  OpenBillingPortalUseCase,
  StartCheckoutUseCase,
} from "./application/billing.use-cases"
import { PaymentGateway } from "./domain/payment-gateway.port"
import { StripePaymentGateway } from "./infrastructure/stripe-payment.gateway"
import { BillingController } from "./presentation/billing.controller"

@Module({
  imports: [IdentityModule],
  controllers: [BillingController],
  providers: [
    { provide: PaymentGateway, useClass: StripePaymentGateway },
    StartCheckoutUseCase,
    OpenBillingPortalUseCase,
    HandleBillingWebhookUseCase,
  ],
})
export class BillingModule {}
