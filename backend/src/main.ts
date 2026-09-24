import "./instrument"
import { Logger } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { AppModule } from "./app.module"
import { configureApp } from "./app.setup"
import { assertSecureConfig, env } from "./config/env"

async function bootstrap() {
  assertSecureConfig()
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true }))
  app.enableShutdownHooks()
  await app.listen(env.port, "0.0.0.0")
  Logger.log(`Aledobe API running on ${env.apiUrl}`, "Bootstrap")
}

bootstrap()
