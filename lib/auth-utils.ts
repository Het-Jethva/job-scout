import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { syncAuthUser } from "@/lib/domains/user/repository"

/**
 * Get the current session on the server
 */
export async function getServerSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const dbUser = await syncAuthUser(user)

  return {
    user: dbUser
      ? {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
      }
      : {
        id: user.id,
        email: user.email ?? "",
        name:
          user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
        image: user.user_metadata?.avatar_url ?? null,
      },
  }
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

/**
 * Ensure user exists in our database (call after auth)
 * This syncs Supabase auth user with our User table
 */
export async function ensureUserInDatabase() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return syncAuthUser(user)
}
