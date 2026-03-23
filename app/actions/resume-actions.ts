"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { parseDocument } from "@/lib/services/document-parser"
import { extractResumeData, generateEmbedding } from "@/lib/services/openrouter"
import {
  deleteResumeByIdForUser,
  findActiveResumeByUserId,
  findUserResumesByUserId,
  setActiveResumeByIdForUser,
} from "@/lib/domains/resume/repository"
import { saveResumeEmbedding } from "@/lib/domains/shared/vector"
import {
  getErrorMessage,
  getValidationErrorMessage,
  revalidatePaths,
} from "@/lib/action-utils"
import { resumeUploadSchema, resumeIdSchema, skillIdSchema, skillsArraySchema, safeValidate } from "@/lib/validations"
import { RATE_LIMITS, checkRateLimit, rateLimitError } from "@/lib/rate-limit"
import { toPrismaJsonValue } from "@/lib/serialization"

export interface UploadResumeResult {
  success: boolean
  resumeId?: string
  error?: string
}

/**
 * Process uploaded resume - parse, extract skills, generate embedding
 */
export async function processResumeUpload(
  fileUrl: string,
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<UploadResumeResult> {
  try {
    // Validate input
    const validation = safeValidate(resumeUploadSchema, {
      fileUrl,
      fileName,
      fileType,
      fileSize,
    })

    if (!validation.success) {
      return { success: false, error: validation.error }
    }

    const session = await requireAuth()
    const userId = session.user.id

    // Apply rate limiting for AI-heavy operations
    const rateLimitResult = checkRateLimit(`user:${userId}`, RATE_LIMITS.aiOperation)
    if (!rateLimitResult.success) {
      return rateLimitError(rateLimitResult)
    }

    const parsedUrl = new URL(fileUrl)

    // Allow Supabase Storage URLs and legacy UploadThing URLs
    const isSupabaseStorage = parsedUrl.hostname.includes("supabase")
    const isUploadThing =
      parsedUrl.hostname.endsWith(".utfs.io") ||
      parsedUrl.hostname.includes("uploadthing")

    if (!isSupabaseStorage && !isUploadThing) {
      return { success: false, error: "Invalid resume file location" }
    }

    // Fetch the file content from trusted upload host only
    const response = await fetch(parsedUrl, { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Failed to fetch uploaded file")
    }

    const declaredSize = response.headers.get("content-length")
    if (declaredSize && Math.abs(Number(declaredSize) - fileSize) > 1024) {
      return { success: false, error: "Resume size mismatch" }
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (Math.abs(buffer.length - fileSize) > 1024) {
      return { success: false, error: "Resume size mismatch" }
    }

    // Parse document
    const parsed = await parseDocument(buffer, fileType)

    // Extract skills and structured data using AI
    const analysis = await extractResumeData(parsed.text)

    // Generate embedding for semantic matching
    const embedding = await generateEmbedding(parsed.text)

    // Use transaction to prevent race conditions when deactivating/creating resumes
    const resume = await db.$transaction(async (tx) => {
      // Deactivate previous resumes
      await tx.resume.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      })

      // Save to database
      const newResume = await tx.resume.create({
        data: {
          userId,
          fileName,
          fileUrl,
          fileType,
          fileSize,
          rawText: parsed.text,
          parsedData: toPrismaJsonValue(analysis),
          skills: analysis.skills.map((s) => s.name),
          experience: toPrismaJsonValue(analysis.experience),
          education: toPrismaJsonValue(analysis.education),
          isActive: true,
        },
      })

      return newResume
    })

    await saveResumeEmbedding(resume.id, embedding)

    revalidatePaths(["/resume", "/dashboard"])

    return { success: true, resumeId: resume.id }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to process resume"),
    }
  }
}

/**
 * Get user's resumes
 */
export async function getUserResumes() {
  const session = await requireAuth()
  return findUserResumesByUserId(session.user.id)
}

/**
 * Get active resume with full data
 */
export async function getActiveResume() {
  const session = await requireAuth()
  return findActiveResumeByUserId(session.user.id)
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
    await deleteResumeByIdForUser(resumeId, session.user.id)

    revalidatePaths(["/resume", "/dashboard"])

    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete resume" }
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
    await setActiveResumeByIdForUser(resumeId, session.user.id)

    revalidatePaths(["/resume", "/dashboard"])

    return { success: true }
  } catch {
    return { success: false, error: "Failed to set active resume" }
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
    return {
      success: false,
      error: getValidationErrorMessage(validation.error, "Invalid skills data"),
    }
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

  revalidatePaths(["/resume"])
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

    revalidatePaths(["/resume"])
    return { success: true }
  } catch {
    return { success: false, error: "Failed to remove skill" }
  }
}
