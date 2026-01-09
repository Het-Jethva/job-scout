"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import {
  fetchAllJobs,
  fetchTheMuseJobs,
  fetchRemotiveJobs,
  fetchRemoteOKJobs,
  type JobListing,
} from "@/lib/services/job-fetcher"
import { generateEmbedding } from "@/lib/services/openrouter"
import { revalidatePath } from "next/cache"

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
      const existing = await db.job.findUnique({
        where: {
          externalId_source: {
            externalId: job.externalId,
            source: job.source,
          },
        },
      })

      if (existing) {
        // Update existing job
        await db.job.update({
          where: { id: existing.id },
          data: {
            title: job.title,
            company: job.company,
            companyLogo: job.companyLogo,
            location: job.location,
            jobType: job.jobType,
            isRemote: job.isRemote,
            salary: job.salary,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            description: job.description,
            categories: job.categories,
            applyUrl: job.applyUrl,
            fetchedAt: new Date(),
          },
        })
        updated++
      } else {
        // Create new job
        await db.job.create({
          data: {
            externalId: job.externalId,
            source: job.source,
            title: job.title,
            company: job.company,
            companyLogo: job.companyLogo,
            location: job.location,
            jobType: job.jobType,
            isRemote: job.isRemote,
            salary: job.salary,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            description: job.description,
            requirements: [],
            skills: [],
            categories: job.categories,
            applyUrl: job.applyUrl,
            publishedAt: job.publishedAt,
            isActive: true,
          },
        })
        added++
      }
    }

    revalidatePath("/jobs")

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

    // Find jobs without embeddings
    const jobs = await db.$queryRaw<Array<{ id: string; description: string }>>`
      SELECT id, description FROM "Job"
      WHERE embedding IS NULL AND "isActive" = true
      LIMIT ${safeLimit}
    `

    let processed = 0

    for (const job of jobs) {
      try {
        const embedding = await generateEmbedding(job.description)

        // pgvector expects a bracketed literal, not a Postgres array
        const embeddingLiteral = `[${embedding.join(",")}]`

        await db.$executeRaw`
          UPDATE "Job"
          SET embedding = ${embeddingLiteral}::vector
          WHERE id = ${job.id}
        `

        processed++
      } catch (_error) {
        // Silently skip jobs that fail embedding generation
      }
    }

    return { success: true, processed }
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
  const page = options?.page || 1
  const limit = options?.limit || 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    isActive: true,
  }

  if (options?.isRemote !== undefined) {
    where.isRemote = options.isRemote
  }

  if (options?.category) {
    where.categories = { has: options.category }
  }

  if (options?.search) {
    where.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { company: { contains: options.search, mode: "insensitive" } },
      { description: { contains: options.search, mode: "insensitive" } },
    ]
  }

  const [jobs, total] = await Promise.all([
    db.job.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        externalId: true,
        source: true,
        title: true,
        company: true,
        companyLogo: true,
        location: true,
        jobType: true,
        isRemote: true,
        salary: true,
        salaryMin: true,
        salaryMax: true,
        categories: true,
        applyUrl: true,
        publishedAt: true,
      },
    }),
    db.job.count({ where }),
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

/**
 * Get a single job with full details
 */
export async function getJob(jobId: string) {
  return db.job.findUnique({
    where: { id: jobId },
    include: {
      matches: {
        select: {
          id: true,
          score: true,
          skillGaps: true,
        },
      },
    },
  })
}

/**
 * Get jobs matched with user's resume
 */
export async function getMatchedJobs(options?: { limit?: number }) {
  const session = await requireAuth()
  const limit = options?.limit || 20

  // Get user's active resume
  const resume = await db.resume.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: { id: true },
  })

  if (!resume) {
    return { jobs: [], message: "No active resume found" }
  }

  // Get matches for this resume
  const matches = await db.match.findMany({
    where: { resumeId: resume.id },
    orderBy: { score: "desc" },
    take: limit,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          companyLogo: true,
          location: true,
          jobType: true,
          isRemote: true,
          salary: true,
          applyUrl: true,
          publishedAt: true,
        },
      },
    },
  })

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
