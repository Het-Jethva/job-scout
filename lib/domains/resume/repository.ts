import {
  findActiveResumeByUserId as findActiveResumeByUserIdFromRepository,
  findActiveResumeIdByUserId as findActiveResumeIdByUserIdFromRepository,
} from "@/lib/repositories/resume-repository"

export async function findActiveResumeByUserId(userId: string) {
  return findActiveResumeByUserIdFromRepository(userId)
}

export async function findActiveResumeIdByUserId(userId: string) {
  return findActiveResumeIdByUserIdFromRepository(userId)
}
