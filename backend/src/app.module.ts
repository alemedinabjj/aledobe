import { Module } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup"
import { env } from "./config/env"
import { HealthController } from "./health/health.controller"
import { BillingModule } from "./modules/billing/billing.module"
import { IdentityModule } from "./modules/identity/identity.module"
import { WorkspaceModule } from "./modules/workspace/workspace.module"
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module"
import { DomainExceptionFilter } from "./shared/presentation/domain-exception.filter"
import { OriginGuard } from "./shared/presentation/origin.guard"
import { PrismaExceptionFilter } from "./shared/presentation/prisma-exception.filter"

@Module({
  imports: [
    SentryModule.forRoot(),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: env.rateLimit }]),
    PrismaModule,
    IdentityModule,
    WorkspaceModule,
    BillingModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
