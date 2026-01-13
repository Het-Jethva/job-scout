/**
 * Rate Limiting Utility
 * Serverless-compatible implementation using in-memory sliding window
 * For production with multiple instances, replace with Redis/Upstash
 */

interface RateLimitEntry {
    count: number
    resetAt: number
}

// In-memory store (works for single instance, replace with Redis for multi-instance)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
const CLEANUP_INTERVAL_MS = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanupExpiredEntries() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key)
        }
    }
    lastCleanup = now
}

export interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    limit: number
    /** Window duration in seconds */
    windowSeconds: number
}

export interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    resetAt: number
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., userId, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining quota
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    cleanupExpiredEntries()

    const now = Date.now()
    const windowMs = config.windowSeconds * 1000
    const key = `ratelimit:${identifier}`

    const existing = rateLimitStore.get(key)

    // If no existing entry or window expired, create new window
    if (!existing || existing.resetAt < now) {
        const entry: RateLimitEntry = {
            count: 1,
            resetAt: now + windowMs,
        }
        rateLimitStore.set(key, entry)

        return {
            success: true,
            limit: config.limit,
            remaining: config.limit - 1,
            resetAt: entry.resetAt,
        }
    }

    // Window still active - check if limit exceeded
    if (existing.count >= config.limit) {
        return {
            success: false,
            limit: config.limit,
            remaining: 0,
            resetAt: existing.resetAt,
        }
    }

    // Increment count
    existing.count++
    rateLimitStore.set(key, existing)

    return {
        success: true,
        limit: config.limit,
        remaining: config.limit - existing.count,
        resetAt: existing.resetAt,
    }
}

/**
 * Pre-configured rate limit configurations
 */
export const RATE_LIMITS = {
    /** AI-heavy operations (resume parsing, matching, tailoring) */
    aiOperation: { limit: 10, windowSeconds: 60 } as RateLimitConfig,

    /** Standard mutations (updates, deletes) */
    mutation: { limit: 30, windowSeconds: 60 } as RateLimitConfig,

    /** Read operations */
    query: { limit: 100, windowSeconds: 60 } as RateLimitConfig,

    /** Sensitive operations (account deletion) */
    sensitive: { limit: 3, windowSeconds: 300 } as RateLimitConfig,
} as const

/**
 * Create a rate limit error response
 */
export function rateLimitError(result: RateLimitResult): {
    success: false
    error: string
    retryAfter: number
} {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
    return {
        success: false,
        error: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
    }
}
