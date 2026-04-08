import "server-only"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { upsertUserFromAuth } from "@/lib/repositories/user-repository"

export interface SessionUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

export interface AppSession {
  user: SessionUser
}

function toSessionUser(user: {
  id: string
  email?: string | null
  user_metadata?: {
    name?: string
    full_name?: string
    avatar_url?: string
    picture?: string
  }
  email_confirmed_at?: string | null
}) {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
    image: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    emailVerified: user.email_confirmed_at != null,
  }
}

export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const syncedUser = await upsertUserFromAuth(toSessionUser(user))

  return {
    user: {
      id: syncedUser.id,
      email: syncedUser.email,
      name: syncedUser.name,
      image: syncedUser.image,
    },
  }
}

export async function requireSession(callbackUrl?: string) {
  const session = await getSession()

  if (!session) {
    if (callbackUrl) {
      const encodedPath = encodeURIComponent(callbackUrl)
      redirect(`/sign-in?callbackUrl=${encodedPath}`)
    }

    redirect("/sign-in")
  }

  return session
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}
