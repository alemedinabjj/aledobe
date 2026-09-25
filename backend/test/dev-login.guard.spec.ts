import { NotFoundException } from "@nestjs/common"
import { env } from "../src/config/env"
import { DevLoginEnabledGuard } from "../src/modules/identity/presentation/dev-login.guard"

describe("DevLoginEnabledGuard", () => {
  const original = env.devLogin
  afterEach(() => {
    env.devLogin = original
  })

  it("hides the route when developer login is disabled", () => {
    env.devLogin = false
    expect(() => new DevLoginEnabledGuard().canActivate()).toThrow(NotFoundException)
  })

  it("lets the request through when developer login is enabled", () => {
    env.devLogin = true
    expect(new DevLoginEnabledGuard().canActivate()).toBe(true)
  })
})
