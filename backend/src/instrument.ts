import * as Sentry from "@sentry/nestjs"
import { env } from "./config/env"

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies
        delete event.request.data
        if (event.request.headers) {
          delete event.request.headers.cookie
          delete event.request.headers.authorization
        }
      }
      if (event.user) event.user = { id: event.user.id }
      return event
    },
  })
}
