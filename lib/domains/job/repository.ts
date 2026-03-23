import { db } from "@/lib/db"
import type { Job } from "@prisma/client"
import type { JobListing } from "@/lib/services/job-fetcher"

export interface ListJobsOptions {
  page?: number
  limit?: number
  category?: string
  isRemote?: boolean
  search?: string
}

export async function upsertFetchedJob(job: JobListing): Promise<"created" | "updated"> {
  const existingJob = await db.job.findUnique({
    where: {
      externalId_source: {
        externalId: job.externalId,
        source: job.source,
      },
    },
    select: { id: true },
  })

  if (existingJob) {
    await db.job.update({
      where: { id: existingJob.id },
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
      },
    })

    return "updated"
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

  return "created"
}

export async function listJobs(options?: ListJobsOptions) {
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

export async function findSimpleJobById(jobId: string): Promise<Job | null> {
  return db.job.findUnique({
    where: { id: jobId },
  })
}

export async function findJobsWithoutEmbeddings(limit: number) {
  return db.$queryRaw<Array<{ id: string; description: string }>>`
    SELECT id, description FROM "Job"
    WHERE embedding IS NULL AND "isActive" = true
    LIMIT ${limit}
  `
}

export async function findRecentJobs(limit: number) {
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
