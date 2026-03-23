/**
 * Server Action Utilities
 * Standardized types and helpers for consistent error handling
 */

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { env } from "./env"
import {
  checkRateLimit,
  rateLimitError,
  type RateLimitConfig,
} from "./rate-limit"

/**
 * Standardized action result type
 * All server actions should return this type for consistency
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; retryAfter?: number }

/**
 * Create a successful action result
 */
export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

/**
 * Create a failed action result
 */
export function err(error: string, retryAfter?: number): ActionResult<never> {
  return { success: false, error, retryAfter }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function getValidationErrorMessage(
  error: { issues?: Array<{ message?: string }> } | undefined,
  fallback = "Invalid input"
): string {
  return error?.issues?.[0]?.message || fallback
}

export function revalidatePaths(paths: string[]): void {
  const uniquePaths = new Set(paths.filter(Boolean))

  for (const path of uniquePaths) {
    revalidatePath(path)
  }
}

/**
 * Validate request origin to prevent CSRF attacks
 * Returns true if origin is valid, false otherwise
 */
export async function validateOrigin(): Promise<boolean> {
  try {
    const headersList = await headers()
    const origin = headersList.get("origin")
    const referer = headersList.get("referer")

    if (env.NODE_ENV === "development") {
      if (!origin && !referer) return true
      if (origin?.includes("localhost")) return true
      if (referer?.includes("localhost")) return true
    }

    const appUrl = new URL(env.NEXT_PUBLIC_APP_URL)
    const allowedOrigins = [appUrl.origin]

    if (origin && allowedOrigins.includes(origin)) {
      return true
    }

    if (referer) {
      const refererUrl = new URL(referer)
      if (allowedOrigins.includes(refererUrl.origin)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Get client identifier for rate limiting
 * Uses user ID if authenticated, falls back to IP
 */
export async function getClientIdentifier(
  userId?: string
): Promise<string> {
  if (userId) return `user:${userId}`

  try {
    const headersList = await headers()
    const forwarded = headersList.get("x-forwarded-for")
    const realIp = headersList.get("x-real-ip")
    const ip = forwarded?.split(",")[0] || realIp || "unknown"
    return `ip:${ip}`
  } catch {
    return "ip:unknown"
  }
}

/**
 * Apply rate limiting to an action
 * @param identifier - Unique identifier for the client
 * @param config - Rate limit configuration
 * @returns null if allowed, error response if rate limited
 */
export function applyRateLimit(
  identifier: string,
  config: RateLimitConfig
): ActionResult<never> | null {
  const result = checkRateLimit(identifier, config)
  if (!result.success) {
    return rateLimitError(result)
  }
  return null
}

/**
 * Wrap an async function with standardized error handling
 * Converts exceptions to ActionResult errors
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorPrefix = "Operation failed"
): Promise<ActionResult<T>> {
  try {
    const result = await fn()
    return ok(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred"

    if (env.NODE_ENV === "production") {
      if (
        message.includes("prisma") ||
        message.includes("database") ||
        message.includes("ECONNREFUSED")
      ) {
        return err(`${errorPrefix}: Database error. Please try again later.`)
      }
      if (message.includes("fetch") || message.includes("network")) {
        return err(`${errorPrefix}: Network error. Please try again later.`)
      }
    }

    return err(`${errorPrefix}: ${message}`)
  }
}

/**
 * Log action errors with context (placeholder for structured logging)
 * TODO: Replace with proper logging service (e.g., Pino, Winston)
 */
export function logActionError(
  actionName: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  console.error(
    JSON.stringify({
      level: "error",
      action: actionName,
      message: errorMessage,
      stack: errorStack,
      context,
      timestamp: new Date().toISOString(),
    })
  )
}
