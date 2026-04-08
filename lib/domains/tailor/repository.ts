import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export async function findJobById(jobId: string) {
  return db.job.findUnique({
    where: { id: jobId },
  })
}

export async function upsertTailoredResume(input: {
  resumeId: string
  jobId: string
  optimizedText: string
  structuredContent?: Prisma.InputJsonValue
  changes: Prisma.InputJsonValue
  keywords: string[]
  atsScore: number
}) {
  return db.tailoredResume.upsert({
    where: {
      resumeId_jobId: {
        resumeId: input.resumeId,
        jobId: input.jobId,
      },
    },
    update: {
      optimizedText: input.optimizedText,
      structuredContent: input.structuredContent,
      changes: input.changes,
      keywords: input.keywords,
      atsScore: input.atsScore,
    },
    create: {
      resumeId: input.resumeId,
      jobId: input.jobId,
      optimizedText: input.optimizedText,
      structuredContent: input.structuredContent,
      changes: input.changes,
      keywords: input.keywords,
      atsScore: input.atsScore,
    },
  })
}

export async function findTailoredResumeByResumeAndJob(
  resumeId: string,
  jobId: string
) {
  return db.tailoredResume.findUnique({
    where: {
      resumeId_jobId: {
        resumeId,
        jobId,
      },
    },
  })
}

export async function findTailoredResumesByResumeId(resumeId: string) {
  return db.tailoredResume.findMany({
    where: { resumeId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function findTailoredResumeWithOwner(tailoredResumeId: string) {
  return db.tailoredResume.findUnique({
    where: { id: tailoredResumeId },
    include: {
      resume: {
        select: { userId: true },
      },
    },
  })
}

export async function deleteTailoredResumeById(tailoredResumeId: string) {
  return db.tailoredResume.delete({
    where: { id: tailoredResumeId },
  })
}
