"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { parseDocument } from "@/lib/services/document-parser"
import { extractResumeData, generateEmbedding } from "@/lib/services/openrouter"
import { resumeUploadSchema, safeValidate } from "@/lib/validations"
import { revalidatePath } from "next/cache"

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

    const parsedUrl = new URL(fileUrl)
    const allowedHosts = new Set(["utfs.io", "uploadthing.com"])
    const allowedHostSuffixes = [
      "uploadthing-prod.s3.amazonaws.com",
      "uploadthing-prod.s3.us-west-2.amazonaws.com",
    ]

    const isAllowedHost =
      parsedUrl.protocol === "https:" &&
      (allowedHosts.has(parsedUrl.hostname) ||
        parsedUrl.hostname.endsWith(".utfs.io") ||
        parsedUrl.hostname.includes("uploadthing") ||
        allowedHostSuffixes.some(
          (suffix) =>
            parsedUrl.hostname === suffix ||
            parsedUrl.hostname.endsWith(`.${suffix}`)
        ) ||
        (parsedUrl.hostname.endsWith(".s3.amazonaws.com") &&
          parsedUrl.pathname.toLowerCase().includes("uploadthing")))

    if (!isAllowedHost) {
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

    // pgvector expects a bracketed list, not a Postgres array literal
    const embeddingLiteral = `[${embedding.join(",")}]`

    // Deactivate previous resumes
    await db.resume.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })

    // Save to database
    const resume = await db.resume.create({
      data: {
        userId,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        rawText: parsed.text,
        parsedData: JSON.parse(JSON.stringify(analysis)),
        skills: analysis.skills.map((s) => s.name),
        experience: JSON.parse(JSON.stringify(analysis.experience)),
        education: JSON.parse(JSON.stringify(analysis.education)),
        isActive: true,
      },
    })

    // Store embedding using raw SQL (Prisma doesn't directly support vector type)
    await db.$executeRaw`
      UPDATE "Resume"
      SET embedding = ${embeddingLiteral}::vector
      WHERE id = ${resume.id}
    `

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

/**
 * Get user's resumes
 */
export async function getUserResumes() {
  const session = await requireAuth()

  const resumes = await db.resume.findMany({
    where: { userId: session.user.id },
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

  return resumes
}

/**
 * Get active resume with full data
 */
export async function getActiveResume() {
  const session = await requireAuth()

  const resume = await db.resume.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
  })

  return resume
}

/**
 * Delete a resume
 */
export async function deleteResume(resumeId: string) {
  const session = await requireAuth()

  await db.resume.delete({
    where: {
      id: resumeId,
      userId: session.user.id,
    },
  })

  revalidatePath("/resume")
  revalidatePath("/dashboard")

  return { success: true }
}

/**
 * Set a resume as active
 */
export async function setActiveResume(resumeId: string) {
  const session = await requireAuth()

  // Deactivate all resumes
  await db.resume.updateMany({
    where: { userId: session.user.id },
    data: { isActive: false },
  })

  // Activate the selected one
  await db.resume.update({
    where: {
      id: resumeId,
      userId: session.user.id,
    },
    data: { isActive: true },
  })

  revalidatePath("/resume")
  revalidatePath("/dashboard")

  return { success: true }
}

/**
 * Add manual skills to user profile
 */
export async function addUserSkills(
  skills: Array<{ skill: string; level?: string; yearsExp?: number }>
) {
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
  const session = await requireAuth()

  await db.userSkill.delete({
    where: {
      id: skillId,
      userId: session.user.id,
    },
  })

  revalidatePath("/resume")
  return { success: true }
}
