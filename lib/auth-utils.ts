import { getCurrentUser, getSession, requireSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { upsertUserFromAuth } from "@/lib/repositories/user-repository"

export async function getServerSession() {
  return getSession()
}

export async function requireAuth() {
  return requireSession()
}

export { getCurrentUser }

export async function ensureUserInDatabase() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return upsertUserFromAuth({
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
    image: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    emailVerified: user.email_confirmed_at != null,
  })
}
