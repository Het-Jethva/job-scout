import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

/**
 * Ensure user exists in database - creates if missing
 */
async function ensureUserExists(authUser: any) {
  const existingUser = await db.user.findUnique({
    where: { id: authUser.id },
  })

  if (!existingUser) {
    // Create user if they don't exist (for existing auth users before trigger was set up)
    await db.user.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? "",
        name:
          authUser.user_metadata?.name ??
          authUser.user_metadata?.full_name ??
          null,
        image:
          authUser.user_metadata?.avatar_url ??
          authUser.user_metadata?.picture ??
          null,
        emailVerified: authUser.email_confirmed_at != null,
      },
    })
  }

  return (
    existingUser ??
    (await db.user.findUnique({
      where: { id: authUser.id },
    }))
  )
}

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

  // Ensure user exists in database
  const dbUser = await ensureUserExists(user)

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

  // Upsert user in our database
  const dbUser = await db.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email ?? "",
      name: user.user_metadata?.name ?? user.user_metadata?.full_name,
      image: user.user_metadata?.avatar_url ?? user.user_metadata?.picture,
    },
    create: {
      id: user.id,
      email: user.email ?? "",
      name: user.user_metadata?.name ?? user.user_metadata?.full_name,
      image: user.user_metadata?.avatar_url ?? user.user_metadata?.picture,
      emailVerified: !!user.email_confirmed_at,
    },
  })

  return dbUser
}
