"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Error already logged by Next.js error boundary
  }, [error])

  // Determine user-friendly error message
  const getUserFriendlyMessage = () => {
    if (
      error.message.includes("UNAUTHORIZED") ||
      error.message.includes("sign-in")
    ) {
      return "You need to be signed in to access this page."
    }
    if (error.message.includes("NOT_FOUND")) {
      return "The requested resource could not be found."
    }
    if (
      error.message.includes("DATABASE") ||
      error.message.includes("prisma")
    ) {
      return "We're having trouble connecting to our database. Please try again later."
    }
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return "There was a network error. Please check your connection and try again."
    }
    return "We encountered an unexpected error while loading this page."
  }

  return (
    <div className="container py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>{getUserFriendlyMessage()}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {process.env.NODE_ENV === "development" && error.message && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-32">
                {error.message}
                {error.digest && `\n\nError ID: ${error.digest}`}
              </pre>
            </details>
          )}
          {error.digest && process.env.NODE_ENV === "production" && (
            <p className="text-xs text-center text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={reset}>Try again</Button>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
