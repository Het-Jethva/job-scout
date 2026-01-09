import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Get the current session on the server
 */
export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

/**
 * Require authentication - redirects to sign-in if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession()
  if (!session) {
    redirect("/sign-in")
  }
  return session
}

/**
 * Get current user or null
 */
export async function getCurrentUser() {
  const session = await getServerSession()
  return session?.user || null
}
