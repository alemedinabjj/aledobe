import type { User } from "../domain/user.entity"

export interface UserView {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  plan: "free" | "pro"
}

export const toUserView = (user: User): UserView => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  plan: user.plan,
})
