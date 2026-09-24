import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common"
import type { Response } from "express"
import { DomainError } from "../domain/errors"

const STATUS: Record<string, number> = {
  not_found: HttpStatus.NOT_FOUND,
  forbidden: HttpStatus.FORBIDDEN,
  validation: HttpStatus.BAD_REQUEST,
  plan_limit: HttpStatus.PAYMENT_REQUIRED,
  configuration: HttpStatus.SERVICE_UNAVAILABLE,
}

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    const status = STATUS[error.code] ?? HttpStatus.BAD_REQUEST
    res.status(status).json({ statusCode: status, code: error.code, message: error.message })
  }
}
