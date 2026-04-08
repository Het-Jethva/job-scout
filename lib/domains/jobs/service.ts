import "server-only"

import {
  countJobs,
  findJobById,
  listJobs,
  listJobsWithoutEmbeddings,
  listRecentJobs,
  readJobEmbedding,
  saveJobEmbedding,
  updateJobEnrichment,
  upsertJobListings,
  type JobFilters,
} from "@/lib/repositories/job-repository"
import { fetchAllJobs, type JobListing } from "@/lib/services/job-fetcher"
import { extractJobRequirements, generateEmbedding } from "@/lib/services/openrouter"

function dedupe(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

export async function syncJobsCatalog(options?: {
  category?: string
  search?: string
}) {
  const jobs = await fetchAllJobs(options)
  const results = await upsertJobListings(jobs)

  return {
    ...results,
    jobs,
  }
}

export async function getJobsCatalog(filters?: JobFilters) {
  const page = filters?.page || 1
  const limit = filters?.limit || 20

  const [jobs, total] = await Promise.all([
    listJobs({
      page,
      limit,
      category: filters?.category,
      isRemote: filters?.isRemote,
      search: filters?.search,
    }),
    countJobs({
      category: filters?.category,
      isRemote: filters?.isRemote,
      search: filters?.search,
    }),
  ])

  return {
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function ensureJobDetails(jobId: string) {
  const job = await findJobById(jobId)
  if (!job) {
    return null
  }

  if (job.skills.length > 0 && job.requirements.length > 0) {
    return job
  }

  const analysis = await extractJobRequirements(job.description)

  await updateJobEnrichment({
    jobId: job.id,
    skills: dedupe(analysis.skills),
    requirements: dedupe([...analysis.requirements, ...analysis.niceToHave]),
  })

  return findJobById(jobId)
}

export async function ensureJobEmbedding(job: {
  id: string
  description: string
}) {
  const existingEmbedding = await readJobEmbedding(job.id)
  if (existingEmbedding) {
    try {
      return JSON.parse(existingEmbedding) as number[]
    } catch {
      // Fall through to regeneration.
    }
  }

  const embedding = await generateEmbedding(job.description)
  await saveJobEmbedding(job.id, embedding)
  return embedding
}

export async function generateJobEmbeddingsForCatalog(limit: number) {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 200))
  const jobs = await listJobsWithoutEmbeddings(safeLimit)

  let processed = 0

  for (const job of jobs) {
    try {
      await ensureJobEmbedding(job)
      processed += 1
    } catch {
      // Skip failures and continue generating what we can.
    }
  }

  return { success: true, processed }
}

export async function getRecentJobFeed(limit: number) {
  return listRecentJobs(limit)
}

export function getJobSourcesSample(source?: string): Promise<JobListing[]> {
  if (!source) {
    return fetchAllJobs()
  }

  return import("@/lib/services/job-fetcher").then((module) => {
    switch (source) {
      case "themuse":
        return module.fetchTheMuseJobs({})
      case "remotive":
        return module.fetchRemotiveJobs({})
      case "remoteok":
        return module.fetchRemoteOKJobs()
      case "arbeitnow":
        return module.fetchArbeitnowJobs()
      case "himalayas":
        return module.fetchHimalayasJobs()
      case "jobicy":
        return module.fetchJobicyJobs()
      default:
        return fetchAllJobs()
    }
  })
}
