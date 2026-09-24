import { ForbiddenError, PlanLimitError, ValidationError } from "../src/shared/domain/errors"
import { User } from "../src/modules/identity/domain/user.entity"
import { Project } from "../src/modules/workspace/domain/project.entity"
import { DesignFile } from "../src/modules/workspace/domain/design-file.entity"
import { FREE_PROJECT_LIMIT, PlanPolicy } from "../src/modules/workspace/domain/plan-policy"

describe("User", () => {
  it("normalizes email and falls back to a name", () => {
    const user = User.create({ email: "  Ana@Mail.COM ", name: "" })
    expect(user.email).toBe("ana@mail.com")
    expect(user.name).toBe("ana")
    expect(user.plan).toBe("free")
  })

  it("rejects invalid emails", () => {
    expect(() => User.create({ email: "nope", name: "x" })).toThrow(ValidationError)
  })

  it("moves between plans", () => {
    const user = User.create({ email: "a@b.co", name: "A" })
    user.activatePro("sub_1")
    expect(user.isPro).toBe(true)
    user.downgradeToFree()
    expect(user.plan).toBe("free")
    expect(user.stripeSubscriptionId).toBeNull()
  })
})

describe("Project", () => {
  it("enforces ownership", () => {
    const project = Project.create({ name: "Brand", ownerId: "u1" })
    expect(() => project.assertOwnedBy("u2")).toThrow(ForbiddenError)
    expect(() => project.assertOwnedBy("u1")).not.toThrow()
  })

  it("validates names and colors", () => {
    const project = Project.create({ name: "Brand", ownerId: "u1" })
    expect(() => project.rename("   ")).toThrow(ValidationError)
    expect(() => project.recolor("purple")).toThrow(ValidationError)
    project.recolor("#a855f7")
    expect(project.color).toBe("#A855F7")
  })
})

describe("DesignFile", () => {
  it("accepts only editor documents", () => {
    expect(() => DesignFile.create({ name: "F", projectId: "p", document: { foo: 1 } })).toThrow(ValidationError)
    const file = DesignFile.create({ name: "F", projectId: "p", document: { name: "F", pages: [], nodes: {} } })
    expect(file.document).toEqual({ name: "F", pages: [], nodes: {} })
  })

  it("duplicates with a deep copy", () => {
    const doc = { name: "F", pages: [{ id: "a" }], nodes: {} }
    const file = DesignFile.create({ name: "F", projectId: "p", document: doc })
    const copy = file.duplicate()
    expect(copy.id).not.toBe(file.id)
    expect(copy.name).toBe("F (copy)")
    ;(copy.document as typeof doc).pages.push({ id: "b" })
    expect(doc.pages).toHaveLength(1)
  })

  it("only stores image thumbnails", () => {
    const file = DesignFile.create({ name: "F", projectId: "p" })
    expect(() => file.setThumbnail("javascript:alert(1)")).toThrow(ValidationError)
    file.setThumbnail("data:image/png;base64,AAA")
    expect(file.thumbnail).toContain("data:image/png")
  })
})

describe("PlanPolicy", () => {
  it("limits free users", () => {
    expect(() => PlanPolicy.assertCanCreateProject("free", FREE_PROJECT_LIMIT)).toThrow(PlanLimitError)
    expect(() => PlanPolicy.assertCanCreateProject("pro", 100)).not.toThrow()
  })
})
