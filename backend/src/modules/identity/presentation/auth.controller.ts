import {
  Body,
  Controller,
  Get,
  HttpCode,
  Next,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"
import { randomBytes, timingSafeEqual } from "node:crypto"
import type { NextFunction, Request, Response } from "express"
import passport from "passport"
import { env, isProviderEnabled } from "../../../config/env"
import { AuthenticateSessionUseCase } from "../application/authenticate-session.use-case"
import { GetCurrentUserUseCase } from "../application/get-current-user.use-case"
import { SignInWithOAuthUseCase } from "../application/sign-in-with-oauth.use-case"
import { SignOutEverywhereUseCase } from "../application/sign-out.use-case"
import { toUserView } from "../application/user.view"
import type { OAuthIdentity } from "../domain/oauth-identity"
import { CurrentUserId } from "./current-user.decorator"
import { DevLoginDto } from "./dev-login.dto"
import {
  clearSessionCookie,
  clearStateCookie,
  OAUTH_STATE_COOKIE,
  setSessionCookie,
  setStateCookie,
} from "./session.cookie"
import { readSessionToken, SessionGuard } from "./session.guard"

const PROVIDERS = ["google", "github", "linkedin"] as const
type Provider = (typeof PROVIDERS)[number]

const isProvider = (p: string): p is Provider => (PROVIDERS as readonly string[]).includes(p)

const sameState = (a: unknown, b: unknown) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length || a.length < 32) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

@Controller("auth")
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AuthController {
  constructor(
    private readonly signIn: SignInWithOAuthUseCase,
    private readonly signOut: SignOutEverywhereUseCase,
    private readonly authenticate: AuthenticateSessionUseCase,
    private readonly currentUser: GetCurrentUserUseCase,
  ) {}

  @Get("providers")
  providers() {
    return { providers: PROVIDERS.filter(isProviderEnabled), devLogin: env.devLogin }
  }

  @Get("me")
  @UseGuards(SessionGuard)
  async me(@CurrentUserId() userId: string) {
    return toUserView(await this.currentUser.execute(userId))
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = readSessionToken(req)
    const user = token ? await this.authenticate.execute(token) : null
    if (user) await this.signOut.execute(user.id)
    clearSessionCookie(res)
  }

  @Post("dev-login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async devLogin(@Body() dto: DevLoginDto, @Res({ passthrough: true }) res: Response) {
    if (!env.devLogin) throw new NotFoundException()
    const { user, token } = await this.signIn.execute({
      provider: "dev",
      providerAccountId: dto.email.toLowerCase(),
      email: dto.email,
      name: dto.name ?? "",
      avatarUrl: null,
      emailVerified: true,
    })
    setSessionCookie(res, token)
    return toUserView(user)
  }

  @Get(":provider")
  start(@Param("provider") provider: string, @Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    if (!isProvider(provider)) throw new NotFoundException()
    if (!isProviderEnabled(provider)) return res.redirect(`${env.frontendUrl}/login?error=provider_disabled`)
    const state = randomBytes(24).toString("hex")
    setStateCookie(res, state)
    passport.authenticate(provider, { session: false, state })(req, res, next)
  }

  @Get(":provider/callback")
  callback(@Param("provider") provider: string, @Req() req: Request, @Res() res: Response) {
    if (!isProvider(provider) || !isProviderEnabled(provider)) throw new NotFoundException()
    const fail = (code = "oauth_failed") => res.redirect(`${env.frontendUrl}/login?error=${code}`)
    const expected = req.cookies?.[OAUTH_STATE_COOKIE]
    clearStateCookie(res)
    if (!sameState(req.query.state, expected)) return fail()
    passport.authenticate(provider, { session: false }, async (err: unknown, identity: OAuthIdentity | false) => {
      if (err || !identity) return fail()
      try {
        const { token } = await this.signIn.execute(identity)
        setSessionCookie(res, token)
        res.redirect(`${env.frontendUrl}/dashboard`)
      } catch {
        fail("email_unverified")
      }
    })(req, res)
  }
}
