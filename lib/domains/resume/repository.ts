import { db } from "@/lib/db"

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

export async function findActiveResumeSummaryByUserId(userId: string) {
  return db.resume.findFirst({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      fileName: true,
      skills: true,
      createdAt: true,
    },
  })
}

export async function findUserResumesByUserId(userId: string) {
  return db.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      fileType: true,
      skills: true,
      isActive: true,
      createdAt: true,
    },
  })
}

export async function deleteResumeByIdForUser(resumeId: string, userId: string) {
  return db.resume.delete({
    where: {
      id: resumeId,
      userId,
    },
  })
}

export async function setActiveResumeByIdForUser(resumeId: string, userId: string) {
  return db.$transaction(async (tx) => {
    await tx.resume.updateMany({
      where: { userId },
      data: { isActive: false },
    })

    await tx.resume.update({
      where: {
        id: resumeId,
        userId,
      },
      data: { isActive: true },
    })
  })
}
