export interface SessionPayload {
  sub: string
  ver: number
}

export abstract class SessionTokenService {
  abstract sign(payload: SessionPayload): Promise<string>
  abstract verify(token: string): Promise<SessionPayload | null>
}
