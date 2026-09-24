export type OAuthProvider = "google" | "github" | "linkedin" | "dev"

export interface OAuthIdentity {
  provider: OAuthProvider
  providerAccountId: string
  email: string
  name: string
  avatarUrl: string | null
  emailVerified: boolean
}
