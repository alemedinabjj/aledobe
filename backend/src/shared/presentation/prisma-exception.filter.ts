import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common"
import { Prisma } from "@prisma/client"
import type { Response } from "express"

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Database")

  catch(error: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "VALIDATION"
    if (code === "P2025")
      return res.status(HttpStatus.NOT_FOUND).json({ statusCode: 404, code: "not_found", message: "Not found" })
    if (code === "P2002")
      return res.status(HttpStatus.CONFLICT).json({ statusCode: 409, code: "conflict", message: "Already exists" })
    this.logger.error(`Database error ${code}`)
    return res.status(HttpStatus.BAD_REQUEST).json({ statusCode: 400, code: "bad_request", message: "Invalid request" })
  }
}
