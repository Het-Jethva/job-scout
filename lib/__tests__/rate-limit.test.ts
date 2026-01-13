import { describe, it, expect } from "vitest"
import {
    checkRateLimit,
    RATE_LIMITS,
    rateLimitError,
} from "../rate-limit"

describe("Rate Limiting", () => {
    describe("checkRateLimit", () => {
        it("should allow first request", () => {
            const identifier = `test-${Date.now()}-1`
            const result = checkRateLimit(identifier, { limit: 5, windowSeconds: 60 })

            expect(result.success).toBe(true)
            expect(result.remaining).toBe(4)
            expect(result.limit).toBe(5)
        })

        it("should track request count", () => {
            const identifier = `test-${Date.now()}-2`
            const config = { limit: 3, windowSeconds: 60 }

            checkRateLimit(identifier, config)
            checkRateLimit(identifier, config)
            const result = checkRateLimit(identifier, config)

            expect(result.success).toBe(true)
            expect(result.remaining).toBe(0)
        })

        it("should block requests after limit exceeded", () => {
            const identifier = `test-${Date.now()}-3`
            const config = { limit: 2, windowSeconds: 60 }

            checkRateLimit(identifier, config)
            checkRateLimit(identifier, config)
            const result = checkRateLimit(identifier, config)

            expect(result.success).toBe(false)
            expect(result.remaining).toBe(0)
        })
    })

    describe("rateLimitError", () => {
        it("should format error response with retry after", () => {
            const result = {
                success: false as const,
                limit: 10,
                remaining: 0,
                resetAt: Date.now() + 30000,
            }

            const error = rateLimitError(result)

            expect(error.success).toBe(false)
            expect(error.error).toContain("Rate limit exceeded")
            expect(error.retryAfter).toBeGreaterThan(0)
        })
    })

    describe("RATE_LIMITS presets", () => {
        it("should have valid configurations", () => {
            expect(RATE_LIMITS.aiOperation.limit).toBe(10)
            expect(RATE_LIMITS.aiOperation.windowSeconds).toBe(60)

            expect(RATE_LIMITS.sensitive.limit).toBe(3)
            expect(RATE_LIMITS.sensitive.windowSeconds).toBe(300)
        })
    })
})
