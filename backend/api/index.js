require("../dist/instrument")
const { NestFactory } = require("@nestjs/core")
const { AppModule } = require("../dist/app.module")
const { configureApp } = require("../dist/app.setup")
const { assertSecureConfig } = require("../dist/config/env")

let handler

async function bootstrap() {
  assertSecureConfig()
  const app = configureApp(await NestFactory.create(AppModule, { rawBody: true, logger: ["error", "warn", "log"] }))
  await app.init()
  return app.getHttpAdapter().getInstance()
}

module.exports = async (req, res) => {
  handler ??= bootstrap().catch((error) => {
    handler = undefined
    throw error
  })
  const app = await handler
  return app(req, res)
}
