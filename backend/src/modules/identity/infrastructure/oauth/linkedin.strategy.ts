import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-oauth2"
import { env } from "../../../../config/env"
import type { OAuthIdentity } from "../../domain/oauth-identity"

interface LinkedinUserInfo {
  sub: string
  name?: string
  email?: string
  picture?: string
  email_verified?: boolean
}

@Injectable()
export class LinkedinStrategy extends PassportStrategy(Strategy, "linkedin") {
  constructor() {
    super({
      authorizationURL: "https://www.linkedin.com/oauth/v2/authorization",
      tokenURL: "https://www.linkedin.com/oauth/v2/accessToken",
      clientID: env.linkedin.clientId,
      clientSecret: env.linkedin.clientSecret,
      callbackURL: `${env.apiUrl}/auth/linkedin/callback`,
      scope: ["openid", "profile", "email"],
    })
  }

  userProfile(accessToken: string, done: (err?: unknown, profile?: LinkedinUserInfo) => void) {
    fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) =>
        r.ok
          ? (r.json() as Promise<LinkedinUserInfo>)
          : Promise.reject(new Error(`LinkedIn userinfo failed: ${r.status}`)),
      )
      .then((info: LinkedinUserInfo) => done(null, info), done)
  }

  validate(_access: string, _refresh: string, info: LinkedinUserInfo): OAuthIdentity {
    if (!info.email) throw new Error("LinkedIn account has no email")
    return {
      provider: "linkedin",
      providerAccountId: info.sub,
      email: info.email,
      name: info.name ?? info.email,
      avatarUrl: info.picture ?? null,
      emailVerified: info.email_verified === true,
    }
  }
}
