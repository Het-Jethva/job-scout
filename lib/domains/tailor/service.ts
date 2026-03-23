import {
  analyzeATSCompatibility,
  tailorResume,
  type ResumeChange,
} from "@/lib/services/openrouter"
import { resolveResumeAnalysis } from "@/lib/domains/resume/analysis"
import {
  findActiveResumeByUserId,
  findActiveResumeIdByUserId,
} from "@/lib/domains/resume/repository"
import {
  deleteTailoredResumeById,
  findJobById,
  findTailoredResumeByResumeAndJob,
  findTailoredResumesByResumeId,
  findTailoredResumeWithOwner,
  upsertTailoredResume,
} from "@/lib/domains/tailor/repository"
import { toPrismaJsonValue } from "@/lib/serialization"

export interface TailoredResumePayload {
  id: string
  optimizedText: string
  changes: ResumeChange[]
  keywords: string[]
  atsScore: number
  summary: string
}

function dedupeSkills(skills: string[]): string[] {
  const unique = new Set(
    skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0)
  )
  return [...unique]
}

export async function tailorResumeForJobUseCase(input: {
  userId: string
  jobId: string
}): Promise<TailoredResumePayload> {
  const activeResume = await findActiveResumeByUserId(input.userId)
  if (!activeResume) {
    throw new Error("No active resume found")
  }

  const job = await findJobById(input.jobId)
  if (!job) {
    throw new Error("Job not found")
  }

  const resumeAnalysis = await resolveResumeAnalysis(
    activeResume.rawText,
    activeResume.parsedData
  )

  const requiredSkills = dedupeSkills(
    job.skills.length > 0
      ? job.skills
      : resumeAnalysis.skills.map((skill) => skill.name)
  )

  const tailored = await tailorResume(
    activeResume.rawText,
    resumeAnalysis,
    job.title,
    job.description,
    requiredSkills
  )

  const persistedTailoredResume = await upsertTailoredResume({
    resumeId: activeResume.id,
    jobId: job.id,
    optimizedText: tailored.optimizedText,
    changes: toPrismaJsonValue(tailored.changes),
    keywords: tailored.addedKeywords,
    atsScore: tailored.atsScore,
  })

  return {
    id: persistedTailoredResume.id,
    optimizedText: tailored.optimizedText,
    changes: tailored.changes,
    keywords: tailored.addedKeywords,
    atsScore: tailored.atsScore,
    summary: tailored.summary,
  }
}

export async function getTailoredResumeForJobUseCase(input: {
  userId: string
  jobId: string
}) {
  const activeResume = await findActiveResumeIdByUserId(input.userId)
  if (!activeResume) {
    return null
  }

  return findTailoredResumeByResumeAndJob(activeResume.id, input.jobId)
}

export async function getUserTailoredResumesUseCase(userId: string) {
  const activeResume = await findActiveResumeIdByUserId(userId)
  if (!activeResume) {
    return []
  }

  return findTailoredResumesByResumeId(activeResume.id)
}

export async function analyzeResumeATSUseCase(userId: string) {
  const activeResume = await findActiveResumeByUserId(userId)
  if (!activeResume) {
    throw new Error("No active resume found")
  }

  return analyzeATSCompatibility(activeResume.rawText)
}

export async function deleteTailoredResumeUseCase(input: {
  userId: string
  tailoredResumeId: string
}) {
  const tailoredResume = await findTailoredResumeWithOwner(input.tailoredResumeId)
  if (!tailoredResume || tailoredResume.resume.userId !== input.userId) {
    throw new Error("Not authorized")
  }

  await deleteTailoredResumeById(input.tailoredResumeId)
}
