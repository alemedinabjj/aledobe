import { ValidationPipe } from "@nestjs/common"
import type { NestExpressApplication } from "@nestjs/platform-express"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import { env } from "./config/env"

export function configureApp(app: NestExpressApplication) {
  app.setGlobalPrefix("api")
  if (env.trustProxy) app.set("trust proxy", 1)
  app.disable("x-powered-by")
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      hsts: env.production ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  )
  app.use(cookieParser())
  app.useBodyParser("json", { limit: "25mb" })
  app.enableCors({
    origin: env.allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  )
  return app
}
