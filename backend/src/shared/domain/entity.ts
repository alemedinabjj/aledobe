import { randomUUID } from "node:crypto"

export abstract class Entity<Props> {
  protected constructor(
    public readonly id: string,
    protected props: Props,
  ) {}

  protected static newId() {
    return randomUUID()
  }

  equals(other?: Entity<Props>) {
    return !!other && other.id === this.id
  }
}
