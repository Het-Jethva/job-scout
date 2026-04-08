"use server"

import { requireAuth } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import {
  generateJobEmbeddingsForCatalog,
  getJobSourcesSample,
  getJobsCatalog,
  ensureJobDetails,
  syncJobsCatalog,
} from "@/lib/domains/jobs/service"
import type { JobListing, JobSource } from "@/lib/services/job-fetcher"
import { getMatchesForActiveResume } from "@/lib/domains/matching/service"
import { findActiveResumeByUserId } from "@/lib/repositories/resume-repository"

/**
 * Sync jobs from all APIs to database
 */
export async function syncJobs(options?: {
  category?: string
  search?: string
}) {
  try {
    await requireAuth()

    const { added, updated, total } = await syncJobsCatalog(options)

    revalidatePath("/jobs")

    return { success: true, added, updated, total }
  } catch (_error) {
    return { success: false, error: "Failed to sync jobs" }
  }
}

/**
 * Generate embeddings for jobs that don't have them
 */
export async function generateJobEmbeddings(limit = 10) {
  try {
    await requireAuth()

    return generateJobEmbeddingsForCatalog(limit)
  } catch (_error) {
    return { success: false, error: "Failed to generate embeddings" }
  }
}

/**
 * Get jobs with pagination and filters
 */
export async function getJobs(options?: {
  page?: number
  limit?: number
  category?: string
  isRemote?: boolean
  search?: string
}) {
  return getJobsCatalog(options)
}

/**
 * Get a single job with full details
 */
export async function getJob(jobId: string) {
  return ensureJobDetails(jobId)
}

/**
 * Get jobs matched with user's resume
 */
export async function getMatchedJobs(options?: { limit?: number }) {
  const session = await requireAuth()
  const activeResume = await findActiveResumeByUserId(session.user.id)

  if (!activeResume) {
    return { jobs: [], message: "No active resume found" }
  }

  const matches = await getMatchesForActiveResume({
    userId: session.user.id,
    limit: options?.limit || 20,
  })

  if (matches.length === 0) {
    return { jobs: [], message: "No matches found" }
  }

  type MatchWithJob = (typeof matches)[number]

  return {
    jobs: matches.map((m: MatchWithJob) => ({
      ...m.job,
      matchScore: m.score,
      skillGaps: m.skillGaps,
      matchId: m.id,
    })),
  }
}

/**
 * Fetch fresh jobs from APIs (not stored)
 */
export async function fetchFreshJobs(
  source?: JobSource
): Promise<JobListing[]> {
  return getJobSourcesSample(source)
}
