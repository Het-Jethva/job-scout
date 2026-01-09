"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import {
  tailorResume,
  analyzeATSCompatibility,
  extractResumeData,
} from "@/lib/services/openrouter"
import { revalidatePath } from "next/cache"

/**
 * Tailor resume for a specific job
 */
export async function tailorResumeForJob(jobId: string) {
  const session = await requireAuth()

  // Get user's active resume
  const resume = await db.resume.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
  })

  if (!resume) {
    return { success: false, error: "No active resume found" }
  }

  // Get job details
  const job = await db.job.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    return { success: false, error: "Job not found" }
  }

  try {
    // Get resume analysis
    let resumeAnalysis: Awaited<ReturnType<typeof extractResumeData>>
    if (resume.parsedData && typeof resume.parsedData === "object") {
      resumeAnalysis = resume.parsedData as unknown as Awaited<
        ReturnType<typeof extractResumeData>
      >
    } else {
      resumeAnalysis = await extractResumeData(resume.rawText)
    }

    // Tailor the resume
    const tailored = await tailorResume(
      resume.rawText,
      resumeAnalysis,
      job.title,
      job.description,
      job.skills.length > 0
        ? job.skills
        : resumeAnalysis.skills.map((s) => s.name)
    )

    // Save tailored resume
    const tailoredResume = await db.tailoredResume.upsert({
      where: {
        resumeId_jobId: {
          resumeId: resume.id,
          jobId: job.id,
        },
      },
      update: {
        optimizedText: tailored.optimizedText,
        changes: JSON.parse(JSON.stringify(tailored.changes)),
        keywords: tailored.addedKeywords,
        atsScore: tailored.atsScore,
      },
      create: {
        resumeId: resume.id,
        jobId: job.id,
        optimizedText: tailored.optimizedText,
        changes: JSON.parse(JSON.stringify(tailored.changes)),
        keywords: tailored.addedKeywords,
        atsScore: tailored.atsScore,
      },
    })

    revalidatePath(`/tailor/${jobId}`)

    return {
      success: true,
      tailoredResume: {
        id: tailoredResume.id,
        optimizedText: tailored.optimizedText,
        changes: tailored.changes,
        keywords: tailored.addedKeywords,
        atsScore: tailored.atsScore,
        summary: tailored.summary,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to tailor resume",
    }
  }
}

/**
 * Get tailored resume for a job
 */
export async function getTailoredResume(jobId: string) {
  const session = await requireAuth()

  const resume = await db.resume.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: { id: true },
  })

  if (!resume) {
    return null
  }

  const tailored = await db.tailoredResume.findUnique({
    where: {
      resumeId_jobId: {
        resumeId: resume.id,
        jobId,
      },
    },
  })

  return tailored
}

/**
 * Get all tailored resumes for user
 */
export async function getUserTailoredResumes() {
  const session = await requireAuth()

  const resume = await db.resume.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: { id: true },
  })

  if (!resume) {
    return []
  }

  const tailored = await db.tailoredResume.findMany({
    where: { resumeId: resume.id },
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

  return tailored
}

/**
 * Analyze ATS compatibility of resume
 */
export async function analyzeResumeATS() {
  const session = await requireAuth()

  const resume = await db.resume.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
  })

  if (!resume) {
    return { success: false, error: "No active resume found" }
  }

  try {
    const analysis = await analyzeATSCompatibility(resume.rawText)

    return {
      success: true,
      analysis,
    }
  } catch (_error) {
    return {
      success: false,
      error: "Failed to analyze resume",
    }
  }
}

/**
 * Delete a tailored resume
 */
export async function deleteTailoredResume(tailoredResumeId: string) {
  const session = await requireAuth()

  // Verify ownership
  const tailored = await db.tailoredResume.findUnique({
    where: { id: tailoredResumeId },
    include: {
      resume: {
        select: { userId: true },
      },
    },
  })

  if (!tailored || tailored.resume.userId !== session.user.id) {
    return { success: false, error: "Not authorized" }
  }

  await db.tailoredResume.delete({
    where: { id: tailoredResumeId },
  })

  revalidatePath("/resume")

  return { success: true }
}
