"use server"

import { requireAuth } from "@/lib/auth-utils"
import { analyzeMatch } from "@/lib/services/matching-engine"
import { resolveResumeAnalysis } from "@/lib/domains/resume/analysis"
import { findActiveResumeByUserId } from "@/lib/domains/resume/repository"
import {
  findJobsWithoutEmbeddings,
  findSimpleJobById,
} from "@/lib/domains/job/repository"
import {
  findSimilarJobsByResumeId,
  upsertMatch,
} from "@/lib/domains/match/repository"
import {
  ensureJobEmbedding,
  ensureResumeEmbedding,
} from "@/lib/domains/shared/vector"
import { getErrorMessage, revalidatePaths } from "@/lib/action-utils"
import { jobIdSchema } from "@/lib/validations"
import { RATE_LIMITS, checkRateLimit, rateLimitError } from "@/lib/rate-limit"

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

  // Get user's active resume
  const resume = await findActiveResumeByUserId(session.user.id)

  if (!resume) {
    return { success: false, error: "No active resume found" }
  }

  const job = await findSimpleJobById(jobId)

  if (!job) {
    return { success: false, error: "Job not found" }
  }

  try {
    const [resumeEmbedding, jobEmbedding] = await Promise.all([
      ensureResumeEmbedding({
        resumeId: resume.id,
        resumeText: resume.rawText,
      }),
      ensureJobEmbedding({
        jobId: job.id,
        jobDescription: job.description,
      }),
    ])

    const resumeAnalysis = await resolveResumeAnalysis(
      resume.rawText,
      resume.parsedData
    )

    // Perform match analysis
    const matchResult = await analyzeMatch(
      resume.rawText,
      resumeAnalysis,
      resumeEmbedding,
      job.description,
      jobEmbedding
    )

    const match = await upsertMatch({
      userId: session.user.id,
      resumeId: resume.id,
      jobId: job.id,
      score: matchResult.score,
      similarityScore: matchResult.similarityScore,
      matchedSkills: matchResult.matchedSkills,
      partialMatches: matchResult.partialMatches,
      missingSkills: matchResult.missingSkills,
      explanation: matchResult.explanation,
    })

    revalidatePaths(["/matches", `/jobs/${jobId}`])

    return {
      success: true,
      match: {
        id: match.id,
        score: match.score,
        matchedSkills: matchResult.matchedSkills,
        partialMatches: matchResult.partialMatches,
        missingSkills: matchResult.missingSkills,
        explanation: matchResult.explanation,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to calculate match"),
    }
  }
}

/**
 * Batch calculate matches for top similar jobs
 */
export async function calculateBatchMatches(limit = 10) {
  const session = await requireAuth()

  const resume = await findActiveResumeByUserId(session.user.id)

  if (!resume) {
    return []
  }

  await ensureResumeEmbedding({
    resumeId: resume.id,
    resumeText: resume.rawText,
  })

  const jobsWithoutEmbeddings = await findJobsWithoutEmbeddings(50)

  const BATCH_SIZE = 5
  for (let i = 0; i < jobsWithoutEmbeddings.length; i += BATCH_SIZE) {
    const batch = jobsWithoutEmbeddings.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(
      batch.map(async (job) => {
        try {
          await ensureJobEmbedding({
            jobId: job.id,
            jobDescription: job.description,
          })
        } catch (_error) {
          // Keep processing the rest of the batch when one job fails.
        }
      })
    )
  }

  const jobs = await findSimilarJobsByResumeId(resume.id, limit)

  const results = []
  const MATCH_BATCH_SIZE = 3

  interface MatchBatchResult {
    jobId: string
    title: string
    success: boolean
    score: number | null
  }

  for (let i = 0; i < jobs.length; i += MATCH_BATCH_SIZE) {
    const batch = jobs.slice(i, i + MATCH_BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map(async (job): Promise<MatchBatchResult> => {
        const result = await calculateJobMatch(job.id)
        return {
          jobId: job.id,
          title: job.title,
          success: result.success,
          score: result.success ? result.match?.score ?? null : null,
        }
      })
    )

    results.push(
      ...batchResults
        .filter((r): r is PromiseFulfilledResult<MatchBatchResult> => r.status === "fulfilled")
        .map((r) => r.value)
    )
  }

  revalidatePaths(["/matches"])

  return results
}
