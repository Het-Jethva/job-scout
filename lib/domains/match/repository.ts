import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export async function upsertMatch(input: {
  userId: string
  resumeId: string
  jobId: string
  score: number
  similarityScore: number
  matchedSkills: string[]
  partialMatches: string[]
  missingSkills: string[]
  explanation: string
}) {
  const skillMatches: Prisma.InputJsonValue = {
    matched: input.matchedSkills,
    partial: input.partialMatches,
    missing: input.missingSkills,
  }

  return db.match.upsert({
    where: {
      resumeId_jobId: {
        resumeId: input.resumeId,
        jobId: input.jobId,
      },
    },
    update: {
      score: input.score,
      similarityScore: input.similarityScore,
      skillMatches,
      skillGaps: input.missingSkills,
      explanation: input.explanation,
    },
    create: {
      userId: input.userId,
      resumeId: input.resumeId,
      jobId: input.jobId,
      score: input.score,
      similarityScore: input.similarityScore,
      skillMatches,
      skillGaps: input.missingSkills,
      explanation: input.explanation,
    },
  })
}

export async function findMatchByResumeAndJob(resumeId: string, jobId: string) {
  return db.match.findUnique({
    where: {
      resumeId_jobId: {
        resumeId,
        jobId,
      },
    },
  })
}

export async function findMatchesByUserId(input: {
  userId: string
  limit: number
  minScore: number
}) {
  return db.match.findMany({
    where: {
      userId: input.userId,
      score: { gte: input.minScore },
    },
    orderBy: { score: "desc" },
    take: input.limit,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          companyLogo: true,
          location: true,
          isRemote: true,
          salary: true,
          applyUrl: true,
        },
      },
    },
  })
}

export async function findMatchedJobsByResumeId(resumeId: string, limit: number) {
  return db.match.findMany({
    where: { resumeId },
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
}

export async function findSimilarJobsByResumeId(resumeId: string, limit: number) {
  type SimilarJob = {
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
  }

  return db.$queryRaw<SimilarJob[]>`
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
