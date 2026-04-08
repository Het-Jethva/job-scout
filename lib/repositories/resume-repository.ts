import "server-only"

import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export interface CreateResumeRecordInput {
  userId: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  storagePath: string
  rawText: string
  parsedData: unknown
  skills: string[]
  experience: unknown
  education: unknown
}

export async function createResumeRecord(input: CreateResumeRecordInput) {
  return db.$transaction(async (tx) => {
    await tx.resume.updateMany({
      where: {
        userId: input.userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    return tx.resume.create({
      data: {
        userId: input.userId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        storagePath: input.storagePath,
        fileType: input.fileType,
        fileSize: input.fileSize,
        rawText: input.rawText,
        parsedData: toJson(input.parsedData),
        skills: input.skills,
        experience: toJson(input.experience),
        education: toJson(input.education),
        isActive: true,
      },
    })
  })
}

export async function listResumesByUserId(userId: string) {
  return db.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      storagePath: true,
      fileType: true,
      skills: true,
      isActive: true,
      createdAt: true,
    },
  })
}

export async function findActiveResumeByUserId(userId: string) {
  return db.resume.findFirst({
    where: {
      userId,
      isActive: true,
    },
  })
}

export async function findActiveResumeIdByUserId(userId: string) {
  return db.resume.findFirst({
    where: {
      userId,
      isActive: true,
    },
    select: { id: true },
  })
}

export async function findResumeByIdForUser(userId: string, resumeId: string) {
  return db.resume.findFirst({
    where: {
      id: resumeId,
      userId,
    },
  })
}

export async function setActiveResumeById(userId: string, resumeId: string) {
  return db.$transaction(async (tx) => {
    await tx.resume.updateMany({
      where: { userId },
      data: { isActive: false },
    })

    return tx.resume.update({
      where: { id: resumeId, userId },
      data: { isActive: true },
    })
  })
}

export async function deleteResumeById(userId: string, resumeId: string) {
  return db.$transaction(async (tx) => {
    const resume = await tx.resume.findFirst({
      where: {
        id: resumeId,
        userId,
      },
    })

    if (!resume) {
      return null
    }

    await tx.resume.delete({
      where: {
        id: resumeId,
        userId,
      },
    })

    if (resume.isActive) {
      const nextResume = await tx.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })

      if (nextResume) {
        await tx.resume.update({
          where: { id: nextResume.id },
          data: { isActive: true },
        })
      }
    }

    return resume
  })
}

export async function saveResumeEmbedding(resumeId: string, embedding: number[]) {
  const embeddingLiteral = `[${embedding.join(",")}]`

  await db.$executeRaw`
    UPDATE "Resume"
    SET embedding = ${embeddingLiteral}::vector
    WHERE id = ${resumeId}
  `
}

export async function readResumeEmbedding(resumeId: string) {
  const rows = await db.$queryRaw<Array<{ embedding: string | null }>>`
    SELECT embedding::text AS embedding
    FROM "Resume"
    WHERE id = ${resumeId}
  `

  return rows[0]?.embedding ?? null
}
