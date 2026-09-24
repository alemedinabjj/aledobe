import { Entity } from "../../../shared/domain/entity"
import { ValidationError } from "../../../shared/domain/errors"

export type Plan = "free" | "pro"

export interface UserProps {
  email: string
  name: string
  avatarUrl: string | null
  plan: Plan
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  sessionVersion: number
  createdAt: Date
}

export class User extends Entity<UserProps> {
  static create(input: { email: string; name: string; avatarUrl?: string | null }, now = new Date()) {
    const email = input.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("A valid email is required")
    return new User(Entity.newId(), {
      email,
      name: input.name.trim() || email.split("@")[0],
      avatarUrl: input.avatarUrl ?? null,
      plan: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      sessionVersion: 0,
      createdAt: now,
    })
  }

  static restore(id: string, props: UserProps) {
    return new User(id, props)
  }

  get email() {
    return this.props.email
  }
  get name() {
    return this.props.name
  }
  get avatarUrl() {
    return this.props.avatarUrl
  }
  get plan() {
    return this.props.plan
  }
  get stripeCustomerId() {
    return this.props.stripeCustomerId
  }
  get stripeSubscriptionId() {
    return this.props.stripeSubscriptionId
  }
  get createdAt() {
    return this.props.createdAt
  }
  get sessionVersion() {
    return this.props.sessionVersion
  }
  get isPro() {
    return this.props.plan === "pro"
  }

  updateProfile(profile: { name?: string | null; avatarUrl?: string | null }) {
    if (profile.name?.trim()) this.props.name = profile.name.trim()
    if (profile.avatarUrl) this.props.avatarUrl = profile.avatarUrl
  }

  revokeSessions() {
    this.props.sessionVersion += 1
  }

  linkBillingCustomer(customerId: string) {
    this.props.stripeCustomerId = customerId
  }

  activatePro(subscriptionId: string) {
    this.props.plan = "pro"
    this.props.stripeSubscriptionId = subscriptionId
  }

  downgradeToFree() {
    this.props.plan = "free"
    this.props.stripeSubscriptionId = null
  }

  toSnapshot() {
    return { id: this.id, ...this.props }
  }
}
