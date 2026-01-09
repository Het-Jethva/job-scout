import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool, neonConfig } from "@neondatabase/serverless"

// Use WebSocket for Neon in Node.js
if (typeof WebSocket === "undefined") {
  const ws = require("ws")
  neonConfig.webSocketConstructor = ws
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please check your .env file."
    )
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool as any)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}

export default db
