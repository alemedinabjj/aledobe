import type { CookieOptions, Response } from "express"
import { env } from "../../../config/env"

export const SESSION_COOKIE = env.cookieSecure ? "__Host-aledobe_session" : "aledobe_session"
export const OAUTH_STATE_COOKIE = "aledobe_oauth_state"

const base = (): CookieOptions => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: "lax",
  path: "/",
})

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7

export const setSessionCookie = (res: Response, token: string) =>
  res.cookie(SESSION_COOKIE, token, { ...base(), maxAge: SEVEN_DAYS })
export const clearSessionCookie = (res: Response) => res.clearCookie(SESSION_COOKIE, base())

export const setStateCookie = (res: Response, state: string) =>
  res.cookie(OAUTH_STATE_COOKIE, state, { ...base(), maxAge: 1000 * 60 * 10 })
export const clearStateCookie = (res: Response) => res.clearCookie(OAUTH_STATE_COOKIE, base())
