import "./instrument"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import type { IncomingMessage, ServerResponse } from "node:http"
import { AppModule } from "./app.module"
import { configureApp } from "./app.setup"
import { assertSecureConfig } from "./config/env"

type Handler = (req: IncomingMessage, res: ServerResponse) => void

let handler: Promise<Handler> | undefined

async function bootstrap(): Promise<Handler> {
  assertSecureConfig()
  const app = configureApp(
    await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true, logger: ["error", "warn", "log"] }),
  )
  await app.init()
  return app.getHttpAdapter().getInstance()
}

export function getHandler() {
  handler ??= bootstrap().catch((error: unknown) => {
    handler = undefined
    throw error
  })
  return handler
}
