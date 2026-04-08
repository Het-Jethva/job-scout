import "server-only"

import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

export interface MatchSkillShape {
  matched: string[]
  partial: string[]
  missing: string[]
}

function toJson(value: MatchSkillShape): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function upsertMatchForResume(input: {
  userId: string
  resumeId: string
  jobId: string
  score: number
  similarityScore: number
  skillMatches: MatchSkillShape
  skillGaps: string[]
  explanation: string
}) {
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
      skillMatches: toJson(input.skillMatches),
      skillGaps: input.skillGaps,
      explanation: input.explanation,
    },
    create: {
      userId: input.userId,
      resumeId: input.resumeId,
      jobId: input.jobId,
      score: input.score,
      similarityScore: input.similarityScore,
      skillMatches: toJson(input.skillMatches),
      skillGaps: input.skillGaps,
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

export async function listMatchesByResumeId(
  resumeId: string,
  options?: {
    limit?: number
    minScore?: number
  }
) {
  return db.match.findMany({
    where: {
      resumeId,
      score: {
        gte: options?.minScore || 0,
      },
    },
    orderBy: { score: "desc" },
    take: options?.limit || 50,
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

export async function listTopMatchesByResumeId(resumeId: string, limit: number) {
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
          location: true,
          isRemote: true,
        },
      },
    },
  })
}
