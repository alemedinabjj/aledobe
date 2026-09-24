import type { OAuthProvider } from "./oauth-identity"
import type { User } from "./user.entity"

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>
  abstract findByEmail(email: string): Promise<User | null>
  abstract findByAccount(provider: OAuthProvider, providerAccountId: string): Promise<User | null>
  abstract findByStripeCustomer(customerId: string): Promise<User | null>
  abstract save(user: User): Promise<void>
  abstract linkAccount(userId: string, provider: OAuthProvider, providerAccountId: string): Promise<void>
}
