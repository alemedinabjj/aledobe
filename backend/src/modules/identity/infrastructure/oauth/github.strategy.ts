import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Profile, Strategy } from "passport-github2"
import { env } from "../../../../config/env"
import type { OAuthIdentity } from "../../domain/oauth-identity"

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, "github") {
  constructor() {
    super({
      clientID: env.github.clientId,
      clientSecret: env.github.clientSecret,
      callbackURL: `${env.apiUrl}/auth/github/callback`,
      scope: ["read:user", "user:email"],
    })
  }

  validate(_access: string, _refresh: string, profile: Profile): OAuthIdentity {
    const emails = (profile.emails ?? []) as { value: string; primary?: boolean; verified?: boolean }[]
    const verified = emails.filter((e) => e.verified)
    const chosen = verified.find((e) => e.primary) ?? verified[0]
    if (!chosen) throw new Error("GitHub account has no verified email")
    const email = chosen.value
    return {
      provider: "github",
      providerAccountId: profile.id,
      email,
      name: profile.displayName || profile.username || email,
      avatarUrl: profile.photos?.[0]?.value ?? null,
      emailVerified: true,
    }
  }
}
