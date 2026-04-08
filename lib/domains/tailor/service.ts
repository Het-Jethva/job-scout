import {
  analyzeATSCompatibility,
  tailorResume,
  type ResumeChange,
  type TailoredResumeResult,
} from "@/lib/services/openrouter"
import type { Prisma } from "@prisma/client"
import { resolveResumeAnalysis } from "@/lib/domains/resume/analysis"
import type { TailoredStructuredContent } from "@/lib/domains/tailor/presentation"
import {
  findActiveResumeByUserId,
  findActiveResumeIdByUserId,
} from "@/lib/domains/resume/repository"
import {
  deleteTailoredResumeById,
  findTailoredResumeByResumeAndJob,
  findTailoredResumesByResumeId,
  findTailoredResumeWithOwner,
  upsertTailoredResume,
} from "@/lib/domains/tailor/repository"
import { ensureJobDetails } from "@/lib/domains/jobs/service"

export interface TailoredResumePayload {
  id: string
  optimizedText: string
  structuredContent: TailoredStructuredContent
  changes: ResumeChange[]
  keywords: string[]
  atsScore: number
  summary: string
}

function toSerializableJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function dedupeSkills(skills: string[]): string[] {
  const unique = new Set(
    skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0)
  )
  return [...unique]
}

function buildStructuredContent(
  tailored: TailoredResumeResult,
  resumeAnalysis: Awaited<ReturnType<typeof resolveResumeAnalysis>>
): TailoredStructuredContent {
  return {
    summary: tailored.summary,
    skills: dedupeSkills([
      ...(tailored.prioritizedSkills || []),
      ...tailored.addedKeywords,
      ...resumeAnalysis.skills.map((skill) => skill.name),
    ]).slice(0, 12),
    experience:
      tailored.experience && tailored.experience.length > 0
        ? tailored.experience
        : resumeAnalysis.experience.map((experience) => ({
            title: experience.title,
            company: experience.company,
            description: experience.responsibilities.join("\n"),
          })),
  }
}

export async function tailorResumeForJobUseCase(input: {
  userId: string
  jobId: string
}): Promise<TailoredResumePayload> {
  const activeResume = await findActiveResumeByUserId(input.userId)
  if (!activeResume) {
    throw new Error("No active resume found")
  }

  const job = await ensureJobDetails(input.jobId)
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

  const structuredContent = buildStructuredContent(tailored, resumeAnalysis)

  const persistedTailoredResume = await upsertTailoredResume({
    resumeId: activeResume.id,
    jobId: job.id,
    optimizedText: tailored.optimizedText,
    structuredContent: toSerializableJson(structuredContent),
    changes: toSerializableJson(tailored.changes),
    keywords: tailored.addedKeywords,
    atsScore: tailored.atsScore,
  })

  return {
    id: persistedTailoredResume.id,
    optimizedText: tailored.optimizedText,
    structuredContent,
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
