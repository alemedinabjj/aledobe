# Security model

## Data access

- **No SQL injection surface.** All database access goes through Prisma's parameterized query builder. Raw SQL is limited to the health check tagged template; CI fails if `$queryRawUnsafe` or `$executeRawUnsafe` appear. Route IDs are validated as UUIDs before reaching the database.
- **Tenant isolation.** Every project and file operation loads the resource and checks ownership in the application layer (`WorkspaceAccess`). Resources owned by someone else answer `404`, so their existence is not revealed.
- **Minimal responses.** Controllers return explicit view models; billing identifiers, linked accounts, owner IDs and internal fields are never serialized.
- **Input validation.** DTOs use `class-validator` with `whitelist` and `forbidNonWhitelisted` (mass assignment is rejected). Documents must match the editor schema and are capped at 20 MB; thumbnails must be base64 PNG, JPEG or WebP data URLs.
- **Errors.** Domain and database errors map to generic messages; stack traces and SQL details are never returned.

## Authentication

- OAuth with Google, GitHub and LinkedIn (OpenID Connect). A CSRF `state` value is bound to an httpOnly cookie and compared in constant time on callback.
- Accounts are created or linked by email **only when the provider reports the email as verified**, preventing account takeover through unverified addresses.
- Sessions are HS256 JWTs with issuer/audience checks, stored in an `httpOnly`, `SameSite=Lax` cookie (`__Host-` prefixed and `Secure` in production). Each token carries a session version; logging out increments it and revokes every session.
- The developer login is impossible to enable when `NODE_ENV=production`.
- The API refuses to start with a weak or placeholder `JWT_SECRET`, a non-HTTPS frontend URL in production, or Stripe without a webhook secret.

## Transport and browser

- Mutating requests from foreign origins are rejected (Origin / `Sec-Fetch-Site` check) on top of strict CORS.
- Helmet on the API (restrictive CSP, HSTS in production, no `X-Powered-By`); nginx adds CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`.
- Rate limiting is global, with stricter limits on authentication routes.
- Stripe webhooks are verified with the signing secret before any state change.

## Operations

- PostgreSQL and the API bind to `127.0.0.1` in `docker-compose.yml`; only nginx is exposed.
- The API container runs as the unprivileged `node` user.
- Sentry strips cookies, authorization headers, request bodies and user PII before sending events.
- `npm audit` (critical), CodeQL (`security-extended`) and Dependabot run in CI.

## Reporting a vulnerability

Please open a private security advisory on GitHub instead of a public issue.
