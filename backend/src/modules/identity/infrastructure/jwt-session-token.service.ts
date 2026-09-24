import { Injectable } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { JWT } from "../../../config/env"
import { SessionPayload, SessionTokenService } from "../application/session-token.port"

@Injectable()
export class JwtSessionTokenService extends SessionTokenService {
  constructor(private readonly jwt: JwtService) {
    super()
  }

  sign(payload: SessionPayload) {
    return this.jwt.signAsync({ sub: payload.sub, ver: payload.ver })
  }

  async verify(token: string) {
    try {
      const { sub, ver } = await this.jwt.verifyAsync<SessionPayload>(token, {
        algorithms: [JWT.algorithm],
        issuer: JWT.issuer,
        audience: JWT.audience,
      })
      if (typeof sub !== "string" || typeof ver !== "number") return null
      return { sub, ver }
    } catch {
      return null
    }
  }
}
