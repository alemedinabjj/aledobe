let handler

async function bootstrap() {
  require("../dist/instrument")
  const { NestFactory } = require("@nestjs/core")
  const { AppModule } = require("../dist/app.module")
  const { configureApp } = require("../dist/app.setup")
  const { assertSecureConfig } = require("../dist/config/env")
  assertSecureConfig()
  const app = configureApp(await NestFactory.create(AppModule, { rawBody: true, logger: ["error", "warn", "log"] }))
  await app.init()
  return app.getHttpAdapter().getInstance()
}

const redact = (text) =>
  String(text ?? "")
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[url]")
    .replace(/(password|secret|token)\S*/gi, "[redacted]")
    .slice(0, 300)

module.exports = async (req, res) => {
  handler ??= bootstrap().catch((error) => {
    handler = undefined
    throw error
  })
  try {
    const app = await handler
    return app(req, res)
  } catch (error) {
    console.error("bootstrap failed", error)
    res.statusCode = 503
    res.setHeader("content-type", "application/json")
    res.end(
      JSON.stringify({
        status: "unavailable",
        node: process.version,
        error: error?.name,
        code: error?.code,
        detail: redact(error?.message),
      }),
    )
  }
}
