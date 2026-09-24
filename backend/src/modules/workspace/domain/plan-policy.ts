import { PlanLimitError } from "../../../shared/domain/errors"

export const FREE_PROJECT_LIMIT = 3

export class PlanPolicy {
  static assertCanCreateProject(plan: "free" | "pro", currentCount: number) {
    if (plan === "free" && currentCount >= FREE_PROJECT_LIMIT) {
      throw new PlanLimitError(
        `The free plan includes ${FREE_PROJECT_LIMIT} projects. Upgrade to Pro for unlimited projects.`,
      )
    }
  }
}
