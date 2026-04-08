import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { upsertUserFromAuth } from "@/lib/repositories/user-repository"

function getSafeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard"
  }

  return value
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = getSafeRedirectPath(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      await upsertUserFromAuth({
        id: data.user.id,
        email: data.user.email ?? "",
        name:
          data.user.user_metadata?.name ?? data.user.user_metadata?.full_name ?? null,
        image:
          data.user.user_metadata?.avatar_url ??
          data.user.user_metadata?.picture ??
          null,
        emailVerified: !!data.user.email_confirmed_at,
      })

      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`)
}
