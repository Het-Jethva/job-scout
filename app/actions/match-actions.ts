"use server"

import { requireAuth } from "@/lib/auth-utils"
import { jobIdSchema } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { RATE_LIMITS, checkRateLimit, rateLimitError } from "@/lib/rate-limit"
import {
  calculateBatchMatchesForUser,
  calculateMatchForUser,
  findSimilarJobsForUser,
  getMatchForActiveResume,
  getMatchesForActiveResume,
} from "@/lib/domains/matching/service"

/**
 * Calculate match between user's resume and a specific job
 */
export async function calculateJobMatch(jobId: string) {
  // Validate input
  const validation = jobIdSchema.safeParse(jobId)
  if (!validation.success) {
    return { success: false, error: "Invalid job ID" }
  }

  const session = await requireAuth()

  // Apply rate limiting for AI-heavy operations
  const rateLimitResult = checkRateLimit(`user:${session.user.id}`, RATE_LIMITS.aiOperation)
  if (!rateLimitResult.success) {
    return rateLimitError(rateLimitResult)
  }

  try {
    const { match, result } = await calculateMatchForUser({
      userId: session.user.id,
      jobId: validation.data,
    })

    revalidatePath("/matches")
    revalidatePath(`/jobs/${jobId}`)

    return {
      success: true,
      match: {
        id: match.id,
        score: match.score,
        matchedSkills: result.matchedSkills,
        partialMatches: result.partialMatches,
        missingSkills: result.missingSkills,
        explanation: result.explanation,
      },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to calculate match",
    }
  }
}

/**
 * Get match for a specific job
 */
export async function getJobMatch(jobId: string) {
  // Validate input
  const validation = jobIdSchema.safeParse(jobId)
  if (!validation.success) {
    return null
  }

  const session = await requireAuth()
  return getMatchForActiveResume({ userId: session.user.id, jobId })
}

/**
 * Get all matches for user
 */
export async function getUserMatches(options?: {
  limit?: number
  minScore?: number
}) {
  const session = await requireAuth()
  return getMatchesForActiveResume({
    userId: session.user.id,
    limit: options?.limit,
    minScore: options?.minScore,
  })
}

/**
 * Find similar jobs using vector search
 */
export async function findSimilarJobs(options?: { limit?: number }) {
  const session = await requireAuth()
  return findSimilarJobsForUser({
    userId: session.user.id,
    limit: options?.limit,
  })
}

/**
 * Batch calculate matches for top similar jobs
 */
export async function calculateBatchMatches(limit = 10) {
  const session = await requireAuth()
  const results = await calculateBatchMatchesForUser({
    userId: session.user.id,
    limit,
  })

  // Revalidate the matches page to ensure it updates
  revalidatePath("/matches")

  return results
}
