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
