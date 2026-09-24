import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const DRIVER_ONLY_PARAMS = ["schema", "connection_limit", "pgbouncer", "sslmode"]

export function createAdapter(databaseUrl = process.env.DATABASE_URL ?? "") {
  const url = new URL(databaseUrl)
  const schema = url.searchParams.get("schema") ?? "public"
  const max = Number(url.searchParams.get("connection_limit") ?? 10)
  const sslmode = url.searchParams.get("sslmode")
  for (const key of DRIVER_ONLY_PARAMS) url.searchParams.delete(key)
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n")
  const ssl =
    sslmode && sslmode !== "disable"
      ? ca
        ? { ca, rejectUnauthorized: true }
        : { rejectUnauthorized: false }
      : undefined
  return new PrismaPg(
    { connectionString: url.toString(), max, ssl, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 },
    { schema },
  )
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: createAdapter() })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
