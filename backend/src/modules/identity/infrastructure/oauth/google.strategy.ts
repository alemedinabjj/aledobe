import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Profile, Strategy } from "passport-google-oauth20"
import { env } from "../../../../config/env"
import type { OAuthIdentity } from "../../domain/oauth-identity"

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: `${env.apiUrl}/auth/google/callback`,
      scope: ["profile", "email"],
    })
  }

  validate(_access: string, _refresh: string, profile: Profile): OAuthIdentity {
    const email = profile.emails?.[0]?.value
    if (!email) throw new Error("Google account has no email")
    return {
      provider: "google",
      providerAccountId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
      emailVerified: (profile._json as { email_verified?: boolean }).email_verified === true,
    }
  }
}
