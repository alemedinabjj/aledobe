export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class NotFoundError extends DomainError {
  readonly code = "not_found"

  constructor(resource: string) {
    super(`${resource} not found`)
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "forbidden"

  constructor(message = "You don't have access to this resource") {
    super(message)
  }
}

export class ValidationError extends DomainError {
  readonly code = "validation"
}

export class PlanLimitError extends DomainError {
  readonly code = "plan_limit"
}

export class ConfigurationError extends DomainError {
  readonly code = "configuration"
}
