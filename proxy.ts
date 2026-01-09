import { NextRequest, NextResponse } from "next/server"

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/resume",
  "/jobs",
  "/matches",
  "/tailor",
  "/settings",
]

// Routes that are only accessible to non-authenticated users
const authRoutes = ["/sign-in", "/sign-up"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // Redirect unauthenticated users from protected routes
  // NOTE: Auth session lookup removed because Prisma/better-auth
  // cannot run inside Next middleware (Edge). Route protection should
  // be handled in server components/actions instead.
  if (isProtectedRoute) {
    return NextResponse.next()
  }

  if (isAuthRoute) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
