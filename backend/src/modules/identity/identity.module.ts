import { Module, type Provider } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import { env, isProviderEnabled, JWT } from "../../config/env"
import { AuthenticateSessionUseCase } from "./application/authenticate-session.use-case"
import { SignOutEverywhereUseCase } from "./application/sign-out.use-case"
import { GetCurrentUserUseCase } from "./application/get-current-user.use-case"
import { SessionTokenService } from "./application/session-token.port"
import { SignInWithOAuthUseCase } from "./application/sign-in-with-oauth.use-case"
import { UserRepository } from "./domain/user.repository"
import { JwtSessionTokenService } from "./infrastructure/jwt-session-token.service"
import { GithubStrategy } from "./infrastructure/oauth/github.strategy"
import { GoogleStrategy } from "./infrastructure/oauth/google.strategy"
import { LinkedinStrategy } from "./infrastructure/oauth/linkedin.strategy"
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository"
import { AuthController } from "./presentation/auth.controller"
import { SessionGuard } from "./presentation/session.guard"

const strategies: Provider[] = [
  ...(isProviderEnabled("google") ? [GoogleStrategy] : []),
  ...(isProviderEnabled("github") ? [GithubStrategy] : []),
  ...(isProviderEnabled("linkedin") ? [LinkedinStrategy] : []),
]

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: { algorithm: JWT.algorithm, issuer: JWT.issuer, audience: JWT.audience, expiresIn: JWT.expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: SessionTokenService, useClass: JwtSessionTokenService },
    SignInWithOAuthUseCase,
    GetCurrentUserUseCase,
    AuthenticateSessionUseCase,
    SignOutEverywhereUseCase,
    SessionGuard,
    ...strategies,
  ],
  exports: [UserRepository, SessionTokenService, SessionGuard, AuthenticateSessionUseCase, GetCurrentUserUseCase],
})
export class IdentityModule {}
