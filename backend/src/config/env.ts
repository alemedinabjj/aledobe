import { config } from "dotenv"

config()

const bool = (v: string | undefined) => v === "true" || v === "1"

const origins = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean)

const nodeEnv = process.env.NODE_ENV ?? "development"
const production = nodeEnv === "production"

export const env = {
  nodeEnv,
  production,
  port: Number(process.env.PORT ?? 3000),
  apiUrl: (process.env.API_URL ?? "http://localhost:3000/api").replace(/\/$/, ""),
  frontendUrl: origins[0],
  allowedOrigins: origins,
  jwtSecret: process.env.JWT_SECRET ?? "",
  cookieSecure: production || bool(process.env.COOKIE_SECURE),
  devLogin: !production && bool(process.env.AUTH_DEV_LOGIN),
  trustProxy: bool(process.env.TRUST_PROXY ?? "true"),
  rateLimit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 300),
  google: { clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" },
  github: { clientId: process.env.GITHUB_CLIENT_ID ?? "", clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "" },
  linkedin: { clientId: process.env.LINKEDIN_CLIENT_ID ?? "", clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "" },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    pricePro: process.env.STRIPE_PRICE_PRO ?? "",
  },
  sentryDsn: process.env.SENTRY_DSN ?? "",
}

export const JWT = {
  algorithm: "HS256" as const,
  issuer: "aledobe-api",
  audience: "aledobe-web",
  expiresIn: "7d" as const,
}

export function assertSecureConfig() {
  const problems: string[] = []
  if (env.jwtSecret.length < 32) problems.push("JWT_SECRET must be at least 32 characters")
  if (env.production && /change-me|secret|password/i.test(env.jwtSecret))
    problems.push("JWT_SECRET looks like a placeholder")
  if (env.production && !env.frontendUrl.startsWith("https://"))
    problems.push("FRONTEND_URL must use https in production")
  if (env.stripe.secretKey && !env.stripe.webhookSecret)
    problems.push("STRIPE_WEBHOOK_SECRET is required when Stripe is enabled")
  if (problems.length) throw new Error(`Insecure configuration:\n- ${problems.join("\n- ")}`)
}

export const isProviderEnabled = (p: "google" | "github" | "linkedin") => !!(env[p].clientId && env[p].clientSecret)
