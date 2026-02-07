"use server"

import { requireAuth } from "@/lib/auth-utils"
import {
  tailorResumeForJobUseCase,
  getTailoredResumeForJobUseCase,
  getUserTailoredResumesUseCase,
  analyzeResumeATSUseCase,
  deleteTailoredResumeUseCase,
} from "@/lib/domains/tailor/service"
import { jobIdSchema, tailoredResumeIdSchema } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { RATE_LIMITS, checkRateLimit, rateLimitError } from "@/lib/rate-limit"

/**
 * Tailor resume for a specific job
 */
export async function tailorResumeForJob(jobId: string) {
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
    const tailoredResume = await tailorResumeForJobUseCase({
      userId: session.user.id,
      jobId: validation.data,
    })
    revalidatePath(`/tailor/${validation.data}`)

    return {
      success: true,
      tailoredResume,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to tailor resume",
    }
  }
}

/**
 * Get tailored resume for a job
 */
export async function getTailoredResume(jobId: string) {
  const validation = jobIdSchema.safeParse(jobId)
  if (!validation.success) {
    return null
  }

  const session = await requireAuth()
  return getTailoredResumeForJobUseCase({
    userId: session.user.id,
    jobId: validation.data,
  })
}

/**
 * Get all tailored resumes for user
 */
export async function getUserTailoredResumes() {
  const session = await requireAuth()
  return getUserTailoredResumesUseCase(session.user.id)
}

/**
 * Analyze ATS compatibility of resume
 */
export async function analyzeResumeATS() {
  const session = await requireAuth()

  try {
    const analysis = await analyzeResumeATSUseCase(session.user.id)
    return {
      success: true,
      analysis,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to analyze resume",
    }
  }
}

/**
 * Delete a tailored resume
 */
export async function deleteTailoredResume(tailoredResumeId: string) {
  const validation = tailoredResumeIdSchema.safeParse(tailoredResumeId)
  if (!validation.success) {
    return { success: false, error: "Invalid tailored resume ID" }
  }

  const session = await requireAuth()

  try {
    await deleteTailoredResumeUseCase({
      userId: session.user.id,
      tailoredResumeId: validation.data,
    })

    revalidatePath("/resume")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete tailored resume",
    }
  }
}
