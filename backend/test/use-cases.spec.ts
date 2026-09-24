import { SignInWithOAuthUseCase } from "../src/modules/identity/application/sign-in-with-oauth.use-case"
import { CreateProjectUseCase } from "../src/modules/workspace/application/project.use-cases"
import {
  CreateFileUseCase,
  GetFileUseCase,
  UpdateFileUseCase,
} from "../src/modules/workspace/application/file.use-cases"
import { WorkspaceAccess } from "../src/modules/workspace/application/workspace-access.service"
import { AuthenticateSessionUseCase } from "../src/modules/identity/application/authenticate-session.use-case"
import { SignOutEverywhereUseCase } from "../src/modules/identity/application/sign-out.use-case"
import { ForbiddenError, NotFoundError, PlanLimitError } from "../src/shared/domain/errors"
import { FakeTokens, FixedPlan, InMemoryFiles, InMemoryProjects, InMemoryUsers } from "./in-memory"

describe("SignInWithOAuthUseCase", () => {
  it("creates a user once and links accounts by email", async () => {
    const users = new InMemoryUsers()
    const signIn = new SignInWithOAuthUseCase(users, new FakeTokens())
    const google = await signIn.execute({
      provider: "google",
      providerAccountId: "g1",
      email: "ana@mail.com",
      name: "Ana",
      avatarUrl: null,
      emailVerified: true,
    })
    const github = await signIn.execute({
      provider: "github",
      providerAccountId: "h1",
      email: "ANA@mail.com",
      name: "Ana S",
      avatarUrl: "http://a",
      emailVerified: true,
    })
    expect(github.user.id).toBe(google.user.id)
    expect(users.users.size).toBe(1)
    expect(github.token).toBe(`token:${google.user.id}:0`)
    expect(github.user.avatarUrl).toBe("http://a")
  })

  it("refuses unverified emails so accounts cannot be hijacked", async () => {
    const users = new InMemoryUsers()
    const signIn = new SignInWithOAuthUseCase(users, new FakeTokens())
    await signIn.execute({
      provider: "google",
      providerAccountId: "g1",
      email: "victim@mail.com",
      name: "V",
      avatarUrl: null,
      emailVerified: true,
    })
    await expect(
      signIn.execute({
        provider: "github",
        providerAccountId: "evil",
        email: "victim@mail.com",
        name: "E",
        avatarUrl: null,
        emailVerified: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(users.accounts.has("github:evil")).toBe(false)
  })

  it("revokes every session on sign out", async () => {
    const users = new InMemoryUsers()
    const tokens = new FakeTokens()
    const { user, token } = await new SignInWithOAuthUseCase(users, tokens).execute({
      provider: "google",
      providerAccountId: "g1",
      email: "a@mail.com",
      name: "A",
      avatarUrl: null,
      emailVerified: true,
    })
    const authenticate = new AuthenticateSessionUseCase(tokens, users)
    expect(await authenticate.execute(token)).not.toBeNull()
    await new SignOutEverywhereUseCase(users).execute(user.id)
    expect(await authenticate.execute(token)).toBeNull()
  })
})

describe("workspace use cases", () => {
  const setup = (plan: "free" | "pro" = "free") => {
    const projects = new InMemoryProjects()
    const files = new InMemoryFiles(projects)
    const access = new WorkspaceAccess(projects, files)
    return {
      createProject: new CreateProjectUseCase(projects, new FixedPlan(plan)),
      createFile: new CreateFileUseCase(files, projects, access),
      getFile: new GetFileUseCase(access),
      updateFile: new UpdateFileUseCase(files, projects, access),
    }
  }

  it("applies the free plan limit", async () => {
    const { createProject } = setup("free")
    for (let i = 0; i < 3; i++) await createProject.execute("u1", `P${i}`)
    await expect(createProject.execute("u1", "P4")).rejects.toBeInstanceOf(PlanLimitError)
  })

  it("lets pro users create unlimited projects", async () => {
    const { createProject } = setup("pro")
    for (let i = 0; i < 5; i++) await createProject.execute("u1", `P${i}`)
  })

  it("isolates files between users", async () => {
    const { createProject, createFile, getFile, updateFile } = setup()
    const { project } = await createProject.execute("owner", "Brand")
    const file = await createFile.execute("owner", project.id, { name: "Home" })
    await expect(getFile.execute("intruder", file.id)).rejects.toBeInstanceOf(NotFoundError)
    const updated = await updateFile.execute("owner", file.id, { name: "Home v2" })
    expect(updated.name).toBe("Home v2")
  })
})
