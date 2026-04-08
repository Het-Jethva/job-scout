import "server-only"

import type { Prisma } from "@prisma/client"
import type { JobListing } from "@/lib/services/job-fetcher"
import { db } from "@/lib/db"

export interface JobFilters {
  page?: number
  limit?: number
  category?: string
  isRemote?: boolean
  search?: string
}

function buildJobWhere(filters: JobFilters): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = {
    isActive: true,
  }

  if (filters.isRemote !== undefined) {
    where.isRemote = filters.isRemote
  }

  if (filters.category) {
    where.categories = { has: filters.category }
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { company: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ]
  }

  return where
}

async function clearJobEmbedding(jobId: string) {
  await db.$executeRaw`
    UPDATE "Job"
    SET embedding = NULL
    WHERE id = ${jobId}
  `
}

export async function upsertJobListings(jobListings: JobListing[]) {
  let added = 0
  let updated = 0

  for (const job of jobListings) {
    const existing = await db.job.findUnique({
      where: {
        externalId_source: {
          externalId: job.externalId,
          source: job.source,
        },
      },
    })

    if (existing) {
      const descriptionChanged = existing.description !== job.description

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
          publishedAt: job.publishedAt,
          fetchedAt: new Date(),
          requirements: descriptionChanged ? [] : existing.requirements,
          skills: descriptionChanged ? [] : existing.skills,
        },
      })

      if (descriptionChanged) {
        await clearJobEmbedding(existing.id)
      }

      updated += 1
      continue
    }

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

    added += 1
  }

  return {
    added,
    updated,
    total: jobListings.length,
  }
}

export async function listJobs(filters: JobFilters) {
  const page = filters.page || 1
  const limit = filters.limit || 20
  const skip = (page - 1) * limit

  return db.job.findMany({
    where: buildJobWhere(filters),
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
  })
}

export async function countJobs(filters: JobFilters) {
  return db.job.count({
    where: buildJobWhere(filters),
  })
}

export async function findJobById(jobId: string) {
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

export async function updateJobEnrichment(input: {
  jobId: string
  requirements: string[]
  skills: string[]
}) {
  return db.job.update({
    where: { id: input.jobId },
    data: {
      requirements: input.requirements,
      skills: input.skills,
    },
  })
}

export async function listRecentJobs(limit: number) {
  return db.job.findMany({
    where: { isActive: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      isRemote: true,
      publishedAt: true,
    },
  })
}

export async function readJobEmbedding(jobId: string) {
  const rows = await db.$queryRaw<Array<{ embedding: string | null }>>`
    SELECT embedding::text AS embedding
    FROM "Job"
    WHERE id = ${jobId}
  `

  return rows[0]?.embedding ?? null
}

export async function saveJobEmbedding(jobId: string, embedding: number[]) {
  const embeddingLiteral = `[${embedding.join(",")}]`

  await db.$executeRaw`
    UPDATE "Job"
    SET embedding = ${embeddingLiteral}::vector
    WHERE id = ${jobId}
  `
}

export async function listJobsWithoutEmbeddings(limit: number) {
  return db.$queryRaw<Array<{ id: string; description: string }>>`
    SELECT id, description
    FROM "Job"
    WHERE embedding IS NULL
      AND "isActive" = true
    LIMIT ${limit}
  `
}

export async function listSimilarJobsByResume(resumeId: string, limit: number) {
  return db.$queryRaw<Array<{
    id: string
    title: string
    company: string
    company_logo: string | null
    location: string
    is_remote: boolean
    salary: string | null
    apply_url: string
    published_at: Date
    similarity: number
  }>>`
    SELECT
      j.id,
      j.title,
      j.company,
      j."companyLogo" as company_logo,
      j.location,
      j."isRemote" as is_remote,
      j.salary,
      j."applyUrl" as apply_url,
      j."publishedAt" as published_at,
      1 - (j.embedding <=> r.embedding) as similarity
    FROM "Job" j
    CROSS JOIN "Resume" r
    WHERE r.id = ${resumeId}
      AND j."isActive" = true
      AND j.embedding IS NOT NULL
      AND r.embedding IS NOT NULL
    ORDER BY j.embedding <=> r.embedding
    LIMIT ${limit}
  `
}
