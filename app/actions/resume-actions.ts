"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import {
  activateResume,
  getActiveResume as getActiveResumeForUser,
  getUserResumes as getUserResumesForUser,
  removeResume,
  uploadResumeForUser,
} from "@/lib/domains/resume/service"
import { resumeIdSchema, skillIdSchema, skillsArraySchema } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { RATE_LIMITS, checkRateLimit, rateLimitError } from "@/lib/rate-limit"

export interface UploadResumeResult {
  success: boolean
  resumeId?: string
  error?: string
}

/**
 * Upload and process a resume from a browser file upload
 */
export async function uploadResume(formData: FormData): Promise<UploadResumeResult> {
  try {
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return { success: false, error: "Please choose a resume file to upload" }
    }

    const session = await requireAuth()
    const userId = session.user.id

    // Apply rate limiting for AI-heavy operations
    const rateLimitResult = checkRateLimit(`user:${userId}`, RATE_LIMITS.aiOperation)
    if (!rateLimitResult.success) {
      return rateLimitError(rateLimitResult)
    }

    const resume = await uploadResumeForUser(userId, file)

    revalidatePath("/resume")
    revalidatePath("/dashboard")

    return { success: true, resumeId: resume.id }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to process resume",
    }
  }
}

export async function processResumeUpload(formData: FormData) {
  return uploadResume(formData)
}

/**
 * Get user's resumes
 */
export async function getUserResumes() {
  const session = await requireAuth()
  return getUserResumesForUser(session.user.id)
}

/**
 * Get active resume with full data
 */
export async function getActiveResume() {
  const session = await requireAuth()
  return getActiveResumeForUser(session.user.id)
}

/**
 * Delete a resume
 */
export async function deleteResume(resumeId: string) {
  // Validate input
  const validation = resumeIdSchema.safeParse(resumeId)
  if (!validation.success) {
    return { success: false, error: "Invalid resume ID" }
  }

  const session = await requireAuth()

  try {
    await removeResume(session.user.id, resumeId)

    revalidatePath("/resume")
    revalidatePath("/dashboard")
    revalidatePath("/matches")

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete resume",
    }
  }
}

/**
 * Set a resume as active
 */
export async function setActiveResume(resumeId: string) {
  // Validate input
  const validation = resumeIdSchema.safeParse(resumeId)
  if (!validation.success) {
    return { success: false, error: "Invalid resume ID" }
  }

  const session = await requireAuth()

  try {
    await activateResume(session.user.id, resumeId)

    revalidatePath("/resume")
    revalidatePath("/dashboard")
    revalidatePath("/matches")

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set active resume",
    }
  }
}

/**
 * Add manual skills to user profile
 */
export async function addUserSkills(
  skills: Array<{ skill: string; level?: string; yearsExp?: number }>
) {
  // Validate input
  const validation = skillsArraySchema.safeParse(skills)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || "Invalid skills data" }
  }

  const session = await requireAuth()

  const results = await Promise.all(
    skills.map((s) =>
      db.userSkill.upsert({
        where: {
          userId_skill: {
            userId: session.user.id,
            skill: s.skill,
          },
        },
        update: {
          level: s.level,
          yearsExp: s.yearsExp,
        },
        create: {
          userId: session.user.id,
          skill: s.skill,
          level: s.level,
          yearsExp: s.yearsExp,
        },
      })
    )
  )

  revalidatePath("/resume")
  return results
}

/**
 * Get user's manual skills
 */
export async function getUserSkills() {
  const session = await requireAuth()

  return db.userSkill.findMany({
    where: { userId: session.user.id },
    orderBy: { skill: "asc" },
  })
}

/**
 * Remove a user skill
 */
export async function removeUserSkill(skillId: string) {
  // Validate input
  const validation = skillIdSchema.safeParse(skillId)
  if (!validation.success) {
    return { success: false, error: "Invalid skill ID" }
  }

  const session = await requireAuth()

  try {
    await db.userSkill.delete({
      where: {
        id: skillId,
        userId: session.user.id,
      },
    })

    revalidatePath("/resume")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to remove skill" }
  }
}
