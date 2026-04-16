import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { publicEnv } from "@/lib/config/public-env"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const applyCacheHeaders = (headers: Record<string, string>) => {
    Object.entries(headers).forEach(([key, value]) => {
      supabaseResponse.headers.set(key, value)
    })
  }

  const redirectWithSession = (url: URL) => {
    const response = NextResponse.redirect(url)

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })

    supabaseResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        response.headers.set(key, value)
      }
    })

    return response
  }

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })

          applyCacheHeaders(headers)
        },
      },
    }
  )

  // Refresh session if expired and verify claims as recommended for SSR auth.
  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims()

  const isAuthenticated = !claimsError && !!claimsData?.claims?.sub

  if (
    isAuthenticated &&
    (request.nextUrl.pathname === "/" ||
      request.nextUrl.pathname.startsWith("/sign-in") ||
      request.nextUrl.pathname.startsWith("/sign-up"))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return redirectWithSession(url)
  }

  return supabaseResponse
}
