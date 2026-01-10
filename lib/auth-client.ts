"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User, Session } from "@supabase/supabase-js"

const supabase = createClient()

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: { message: error.message } }
  }

  return { data, error: null }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        full_name: name,
      },
    },
  })

  if (error) {
    return { error: { message: error.message } }
  }

  return { data, error: null }
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  return { data: data.session, error }
}

/**
 * Hook to get current session with real-time updates
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isPending, setIsPending] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsPending(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsPending(false)
      router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Transform user data to match expected format
  const userData = user
    ? {
        id: user.id,
        email: user.email ?? "",
        name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
        image:
          user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      }
    : null

  return {
    data: session ? { session, user: userData } : null,
    isPending,
    error: null,
  }
}

/**
 * Compatibility exports for easier migration
 */
export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    return signInWithEmail(email, password)
  },
}

export const signUp = {
  email: async ({
    email,
    password,
    name,
  }: {
    email: string
    password: string
    name?: string
  }) => {
    return signUpWithEmail(email, password, name)
  },
}
