import { Test } from "@nestjs/testing"
import type { NestExpressApplication } from "@nestjs/platform-express"
import request from "supertest"
import { AppModule } from "../../src/app.module"
import { configureApp } from "../../src/app.setup"
import { PrismaService } from "../../src/shared/infrastructure/prisma/prisma.service"
import { sessionCookie, signedInAgent } from "./session"

describe("Aledobe API (e2e)", () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const login = (email: string) => signedInAgent(app, email)

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true }))
    await app.init()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await prisma.file.deleteMany()
    await prisma.project.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await app?.close()
  })

  it("reports health", async () => {
    await request(app.getHttpServer()).get("/api/health").expect(200, { status: "ok" })
  })

  it("requires a session", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401)
    await request(app.getHttpServer()).get("/api/projects").expect(401)
  })

  it("signs in and returns the current user", async () => {
    const agent = await login("Designer@Studio.com")
    const me = await agent.get("/api/auth/me").expect(200)
    expect(me.body).toMatchObject({ email: "designer@studio.com", plan: "free" })
  })

  it("manages projects and files end to end", async () => {
    const agent = await login("owner@studio.com")
    const project = (await agent.post("/api/projects").send({ name: "Website" }).expect(201)).body
    const file = (await agent.post(`/api/projects/${project.id}/files`).send({ name: "Home" }).expect(201)).body

    const document = { name: "Home", pages: [{ id: "p", name: "Page 1", children: [], background: "#fff" }], nodes: {} }
    await agent.patch(`/api/files/${file.id}`).send({ document, name: "Home v2" }).expect(200)

    const loaded = (await agent.get(`/api/files/${file.id}`).expect(200)).body
    expect(loaded).toMatchObject({ name: "Home v2", document })

    await agent.post(`/api/files/${file.id}/duplicate`).expect(201)
    const files = (await agent.get(`/api/projects/${project.id}/files`).expect(200)).body
    expect(files).toHaveLength(2)

    const projects = (await agent.get("/api/projects").expect(200)).body
    expect(projects[0]).toMatchObject({ name: "Website", fileCount: 2 })

    await agent.delete(`/api/projects/${project.id}`).expect(204)
    await agent.get(`/api/files/${file.id}`).expect(404)
  })

  it("validates payloads", async () => {
    const agent = await login("v@studio.com")
    await agent.post("/api/projects").send({ name: "" }).expect(400)
    const project = (await agent.post("/api/projects").send({ name: "P" }).expect(201)).body
    const file = (await agent.post(`/api/projects/${project.id}/files`).send({ name: "F" }).expect(201)).body
    const res = await agent
      .patch(`/api/files/${file.id}`)
      .send({ document: { invalid: true } })
      .expect(400)
    expect(res.body.code).toBe("validation")
  })

  it("isolates workspaces between users", async () => {
    const owner = await login("a@studio.com")
    const intruder = await login("b@studio.com")
    const project = (await owner.post("/api/projects").send({ name: "Secret" }).expect(201)).body
    await intruder.get(`/api/projects/${project.id}/files`).expect(404)
    await intruder.delete(`/api/projects/${project.id}`).expect(404)
  })

  it("enforces the free plan project limit", async () => {
    const agent = await login("limit@studio.com")
    for (const name of ["A", "B", "C"]) await agent.post("/api/projects").send({ name }).expect(201)
    const res = await agent.post("/api/projects").send({ name: "D" }).expect(402)
    expect(res.body.code).toBe("plan_limit")
  })

  it("redirects disabled oauth providers back to the login page", async () => {
    const res = await request(app.getHttpServer()).get("/api/auth/github").expect(302)
    expect(res.headers.location).toContain("/login?error=provider_disabled")
  })
})

describe("Security (e2e)", () => {
  let app: NestExpressApplication
  let prisma: PrismaService

  const login = (email: string) => signedInAgent(app, email)

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>({ rawBody: true }))
    await app.init()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await prisma.file.deleteMany()
    await prisma.project.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await app?.close()
  })

  it("treats SQL injection payloads as plain data", async () => {
    const agent = await login("sqli@studio.com")
    const payload = 'x\'); DROP TABLE "User"; --'
    const project = (await agent.post("/api/projects").send({ name: payload }).expect(201)).body
    expect(project.name).toBe(payload)
    await agent.get("/api/projects/1%20OR%201%3D1/files").expect(400)
    await agent.get("/api/files/' OR '1'='1").expect(400)
    expect(await prisma.user.count()).toBe(1)
  })

  it("never exposes internal or billing fields", async () => {
    const agent = await login("leak@studio.com")
    const me = (await agent.get("/api/auth/me").expect(200)).body
    expect(Object.keys(me).sort()).toEqual(["avatarUrl", "email", "id", "name", "plan"])
    const project = (await agent.post("/api/projects").send({ name: "P" }).expect(201)).body
    expect(project).not.toHaveProperty("ownerId")
  })

  it("hides other users' resources behind 404", async () => {
    const owner = await login("owner2@studio.com")
    const intruder = await login("intruder@studio.com")
    const project = (await owner.post("/api/projects").send({ name: "Private" }).expect(201)).body
    const file = (await owner.post(`/api/projects/${project.id}/files`).send({ name: "F" }).expect(201)).body
    await intruder.get(`/api/files/${file.id}`).expect(404)
    await intruder.patch(`/api/files/${file.id}`).send({ name: "hacked" }).expect(404)
    await intruder.delete(`/api/projects/${project.id}`).expect(404)
    const mine = (await intruder.get("/api/files/recent").expect(200)).body
    expect(mine).toHaveLength(0)
  })

  it("rejects unknown fields and oversized or forged thumbnails", async () => {
    const agent = await login("mass@studio.com")
    await agent.post("/api/projects").send({ name: "P", ownerId: "someone-else" }).expect(400)
    const project = (await agent.post("/api/projects").send({ name: "P" }).expect(201)).body
    const file = (await agent.post(`/api/projects/${project.id}/files`).send({ name: "F" }).expect(201)).body
    await agent
      .patch(`/api/files/${file.id}`)
      .send({ thumbnail: "data:image/svg+xml,<svg onload=alert(1)>" })
      .expect(400)
  })

  it("blocks cross-origin state changes", async () => {
    const agent = await login("csrf@studio.com")
    await agent.post("/api/projects").set("Origin", "https://evil.example").send({ name: "P" }).expect(403)
    await agent.post("/api/projects").set("Sec-Fetch-Site", "cross-site").send({ name: "P" }).expect(403)
  })

  it("rejects tampered and revoked tokens", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").set("Authorization", "Bearer abc.def.ghi").expect(401)
    const agent = await login("revoke@studio.com")
    await agent.get("/api/auth/me").expect(200)
    const cookie = await sessionCookie(app, "revoke@studio.com")
    await agent.post("/api/auth/logout").expect(204)
    await request(app.getHttpServer()).get("/api/auth/me").set("Cookie", cookie).expect(401)
  })

  it("sets hardened headers and httpOnly cookies", async () => {
    const res = await (await login("h@studio.com")).post("/api/auth/logout").expect(204)
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/)
    expect(res.headers["set-cookie"][0]).toMatch(/SameSite=Lax/)
    expect(res.headers["x-powered-by"]).toBeUndefined()
    expect(res.headers["x-content-type-options"]).toBe("nosniff")
  })

  it("offers no way to sign in without an oauth provider", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/dev-login")
      .send({ email: "ghost@studio.com", name: "Ghost" })
      .expect(404)
    const res = await request(app.getHttpServer()).get("/api/auth/providers").expect(200)
    expect(Object.keys(res.body)).toEqual(["providers"])
    expect(await prisma.user.count()).toBe(0)
  })

  it("rejects OAuth callbacks without a valid state", async () => {
    const res = await request(app.getHttpServer()).get("/api/auth/google/callback?code=x&state=y")
    expect([302, 404]).toContain(res.status)
  })
})
