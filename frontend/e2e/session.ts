import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import type { BrowserContext } from "@playwright/test"

const issueSession = `
const { NestFactory } = require("@nestjs/core")
const { AppModule } = require("./dist/app.module")
const { SignInWithOAuthUseCase } = require("./dist/modules/identity/application/sign-in-with-oauth.use-case")
const { SESSION_COOKIE } = require("./dist/modules/identity/presentation/session.cookie")
;(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  const email = process.env.E2E_EMAIL
  const { token } = await app.get(SignInWithOAuthUseCase).execute({
    provider: "github",
    providerAccountId: email,
    email,
    name: "E2E Designer",
    avatarUrl: null,
    emailVerified: true,
  })
  process.stdout.write(JSON.stringify({ name: SESSION_COOKIE, value: token }))
  await app.close()
})()
`

export async function signInAs(context: BrowserContext, email: string, baseURL: string) {
  const backendDir = process.env.E2E_BACKEND_DIR
  const output = backendDir
    ? execFileSync("node", ["-e", issueSession], {
        cwd: backendDir,
        env: { ...process.env, E2E_EMAIL: email },
        encoding: "utf8",
      })
    : execFileSync(
        "docker",
        [
          "compose",
          "-f",
          fileURLToPath(new URL("../../docker-compose.yml", import.meta.url)),
          "exec",
          "-T",
          "-e",
          `E2E_EMAIL=${email}`,
          "backend",
          "node",
          "-e",
          issueSession,
        ],
        { encoding: "utf8" },
      )
  const cookie = JSON.parse(output.trim().split("\n").pop() ?? "{}") as { name: string; value: string }
  await context.addCookies([{ ...cookie, url: baseURL, httpOnly: true, sameSite: "Lax" }])
}
