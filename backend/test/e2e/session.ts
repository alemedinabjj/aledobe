import type { INestApplication } from "@nestjs/common"
import request from "supertest"
import { SignInWithOAuthUseCase } from "../../src/modules/identity/application/sign-in-with-oauth.use-case"
import { SESSION_COOKIE } from "../../src/modules/identity/presentation/session.cookie"

export async function sessionCookie(app: INestApplication, email: string) {
  const { token } = await app.get(SignInWithOAuthUseCase).execute({
    provider: "github",
    providerAccountId: email,
    email,
    name: email.split("@")[0],
    avatarUrl: null,
    emailVerified: true,
  })
  return `${SESSION_COOKIE}=${token}`
}

export async function signedInAgent(app: INestApplication, email: string) {
  const cookie = await sessionCookie(app, email)
  return request.agent(app.getHttpServer()).set("Cookie", cookie)
}
