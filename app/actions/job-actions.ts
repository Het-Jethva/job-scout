"use server"

import { requireAuth } from "@/lib/auth-utils"
import {
  fetchAllJobs,
  fetchTheMuseJobs,
  fetchRemotiveJobs,
  fetchRemoteOKJobs,
  type JobListing,
} from "@/lib/services/job-fetcher"
import { ensureJobEmbedding } from "@/lib/domains/shared/vector"
import {
  findJobsWithoutEmbeddings,
  upsertFetchedJob,
} from "@/lib/domains/job/repository"
import { revalidatePaths } from "@/lib/action-utils"

/**
 * Sync jobs from all APIs to database
 */
export async function syncJobs(options?: {
  category?: string
  search?: string
}) {
  try {
    await requireAuth()

    const jobs = await fetchAllJobs(options)

    let added = 0
    let updated = 0

    for (const job of jobs) {
      const result = await upsertFetchedJob(job)

      if (result === "updated") {
        updated++
      } else {
        added++
      }
    }

    revalidatePaths(["/jobs"])

    return { success: true, added, updated, total: jobs.length }
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

    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 200))
    const jobs = await findJobsWithoutEmbeddings(safeLimit)

    let processed = 0

    for (const job of jobs) {
      try {
        await ensureJobEmbedding({
          jobId: job.id,
          jobDescription: job.description,
        })
        processed++
      } catch (_error) {
        // Continue processing remaining jobs when a single embedding fails.
      }
    }

    return { success: true, processed }
  } catch (_error) {
    return { success: false, error: "Failed to generate embeddings" }
  }
}

/**
 * Fetch fresh jobs from APIs (not stored)
 */
export async function fetchFreshJobs(
  source?: "themuse" | "remotive" | "remoteok"
): Promise<JobListing[]> {
  if (source === "themuse") {
    return fetchTheMuseJobs({})
  }
  if (source === "remotive") {
    return fetchRemotiveJobs({})
  }
  if (source === "remoteok") {
    return fetchRemoteOKJobs()
  }

  return fetchAllJobs()
}
