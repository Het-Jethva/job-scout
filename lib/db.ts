import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { getDatabaseEnv } from "@/lib/config/server-env"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function createPrismaClient() {
  const { DATABASE_URL } = getDatabaseEnv()

  // Reuse existing pool in production to avoid connection churn
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString: DATABASE_URL,
      // SSL configuration for Supabase/production
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
      // Connection pool settings for serverless
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  const adapter = new PrismaPg(globalForPrisma.pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// Cache the client in both development and production
globalForPrisma.prisma = db

export default db
