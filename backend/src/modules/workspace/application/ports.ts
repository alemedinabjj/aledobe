export abstract class AccountPlanReader {
  abstract planOf(userId: string): Promise<"free" | "pro">
}
