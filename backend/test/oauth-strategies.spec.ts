import { GithubStrategy } from "../src/modules/identity/infrastructure/oauth/github.strategy"
import { GoogleStrategy } from "../src/modules/identity/infrastructure/oauth/google.strategy"
import { LinkedinStrategy } from "../src/modules/identity/infrastructure/oauth/linkedin.strategy"

const call = <T>(proto: { validate: (...args: never[]) => T }, profile: unknown) =>
  (proto.validate as (...args: unknown[]) => T).call({}, "access", "refresh", profile)

describe("OAuth profile mapping", () => {
  it("uses the primary verified GitHub email", () => {
    const identity = call(GithubStrategy.prototype, {
      id: "42",
      username: "ana",
      displayName: "",
      emails: [
        { value: "old@mail.com", primary: false, verified: true },
        { value: "ana@mail.com", primary: true, verified: true },
      ],
      photos: [{ value: "https://avatars/a.png" }],
    })
    expect(identity).toMatchObject({ provider: "github", email: "ana@mail.com", name: "ana", emailVerified: true })
  })

  it("rejects GitHub accounts without a verified email", () => {
    expect(() =>
      call(GithubStrategy.prototype, { id: "1", emails: [{ value: "x@mail.com", primary: true, verified: false }] }),
    ).toThrow()
  })

  it("reads Google email verification", () => {
    const identity = call(GoogleStrategy.prototype, {
      id: "g",
      displayName: "Ana",
      emails: [{ value: "ana@gmail.com" }],
      photos: [],
      _json: { email_verified: true },
    })
    expect(identity).toMatchObject({ provider: "google", email: "ana@gmail.com", emailVerified: true })
  })

  it("reads LinkedIn OpenID userinfo", () => {
    const identity = call(LinkedinStrategy.prototype, {
      sub: "li-1",
      name: "Ana",
      email: "ana@work.com",
      email_verified: true,
      picture: "https://media/p.jpg",
    })
    expect(identity).toMatchObject({ provider: "linkedin", providerAccountId: "li-1", emailVerified: true })
  })
})
