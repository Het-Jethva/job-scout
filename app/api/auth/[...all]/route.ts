import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)

// Prisma/better-auth require Node.js runtime
export const runtime = "nodejs"
