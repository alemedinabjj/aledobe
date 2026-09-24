import { Entity } from "../../../shared/domain/entity"
import { ForbiddenError, ValidationError } from "../../../shared/domain/errors"

export const PROJECT_COLORS = ["#A855F7", "#E879F9", "#22D3EE", "#10B981", "#F59E0B", "#F43F5E", "#6366F1"] as const

export interface ProjectProps {
  name: string
  color: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

const cleanName = (name: string) => {
  const value = name.trim()
  if (!value) throw new ValidationError("Project name is required")
  if (value.length > 80) throw new ValidationError("Project name must be at most 80 characters")
  return value
}

export class Project extends Entity<ProjectProps> {
  static create(input: { name: string; ownerId: string; color?: string }, now = new Date()) {
    return new Project(Entity.newId(), {
      name: cleanName(input.name),
      ownerId: input.ownerId,
      color: input.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      createdAt: now,
      updatedAt: now,
    })
  }

  static restore(id: string, props: ProjectProps) {
    return new Project(id, props)
  }

  get name() {
    return this.props.name
  }
  get color() {
    return this.props.color
  }
  get ownerId() {
    return this.props.ownerId
  }
  get createdAt() {
    return this.props.createdAt
  }
  get updatedAt() {
    return this.props.updatedAt
  }

  isOwnedBy(userId: string) {
    return this.props.ownerId === userId
  }

  assertOwnedBy(userId: string) {
    if (this.props.ownerId !== userId) throw new ForbiddenError()
  }

  rename(name: string) {
    this.props.name = cleanName(name)
  }

  recolor(color: string) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new ValidationError("Color must be a hex value")
    this.props.color = color.toUpperCase()
  }

  toSnapshot() {
    return { id: this.id, ...this.props }
  }
}
