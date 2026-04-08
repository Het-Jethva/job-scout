import "server-only"

import { resolveResumeAnalysis } from "@/lib/domains/resume/analysis"
import { analyzeMatch, type JobRequirementSnapshot } from "@/lib/services/matching-engine"
import { generateEmbedding } from "@/lib/services/openrouter"
import {
  findActiveResumeByUserId,
  readResumeEmbedding,
  saveResumeEmbedding,
} from "@/lib/repositories/resume-repository"
import {
  ensureJobDetails,
  ensureJobEmbedding,
} from "@/lib/domains/jobs/service"
import {
  listJobsWithoutEmbeddings,
  listSimilarJobsByResume,
} from "@/lib/repositories/job-repository"
import {
  findMatchByResumeAndJob,
  listMatchesByResumeId,
  upsertMatchForResume,
} from "@/lib/repositories/match-repository"

async function ensureResumeEmbeddingForMatch(resume: {
  id: string
  rawText: string
}) {
  const existingEmbedding = await readResumeEmbedding(resume.id)
  if (existingEmbedding) {
    try {
      return JSON.parse(existingEmbedding) as number[]
    } catch {
      // Fall through to regeneration.
    }
  }

  const embedding = await generateEmbedding(resume.rawText)
  await saveResumeEmbedding(resume.id, embedding)
  return embedding
}

function toJobRequirementSnapshot(job: {
  requirements: string[]
  skills: string[]
}): JobRequirementSnapshot {
  return {
    requirements: job.requirements,
    skills: job.skills,
  }
}

export async function calculateMatchForUser(input: { userId: string; jobId: string }) {
  const resume = await findActiveResumeByUserId(input.userId)
  if (!resume) {
    throw new Error("No active resume found")
  }

  const job = await ensureJobDetails(input.jobId)
  if (!job) {
    throw new Error("Job not found")
  }

  const [resumeEmbedding, jobEmbedding, resumeAnalysis] = await Promise.all([
    ensureResumeEmbeddingForMatch(resume),
    ensureJobEmbedding(job),
    resolveResumeAnalysis(resume.rawText, resume.parsedData),
  ])

  const matchResult = await analyzeMatch(
    resume.rawText,
    resumeAnalysis,
    resumeEmbedding,
    job.description,
    jobEmbedding,
    toJobRequirementSnapshot(job)
  )

  const match = await upsertMatchForResume({
    userId: input.userId,
    resumeId: resume.id,
    jobId: job.id,
    score: matchResult.score,
    similarityScore: matchResult.similarityScore,
    skillMatches: {
      matched: matchResult.matchedSkills,
      partial: matchResult.partialMatches,
      missing: matchResult.missingSkills,
    },
    skillGaps: matchResult.missingSkills,
    explanation: matchResult.explanation,
  })

  return {
    match,
    result: matchResult,
    resume,
  }
}

export async function getMatchForActiveResume(input: {
  userId: string
  jobId: string
}) {
  const resume = await findActiveResumeByUserId(input.userId)
  if (!resume) {
    return null
  }

  return findMatchByResumeAndJob(resume.id, input.jobId)
}

export async function getMatchesForActiveResume(input: {
  userId: string
  limit?: number
  minScore?: number
}) {
  const resume = await findActiveResumeByUserId(input.userId)
  if (!resume) {
    return []
  }

  return listMatchesByResumeId(resume.id, {
    limit: input.limit,
    minScore: input.minScore,
  })
}

export async function findSimilarJobsForUser(input: {
  userId: string
  limit?: number
}) {
  const resume = await findActiveResumeByUserId(input.userId)
  if (!resume) {
    return { jobs: [], message: "No active resume found" }
  }

  const rows = await listSimilarJobsByResume(resume.id, input.limit || 20)

  return {
    jobs: rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      companyLogo: row.company_logo,
      location: row.location,
      isRemote: row.is_remote,
      salary: row.salary,
      applyUrl: row.apply_url,
      publishedAt: row.published_at,
      similarity: Math.round(row.similarity * 100),
    })),
  }
}

export async function calculateBatchMatchesForUser(input: {
  userId: string
  limit?: number
}) {
  const resume = await findActiveResumeByUserId(input.userId)
  if (!resume) {
    return []
  }

  await ensureResumeEmbeddingForMatch(resume)

  const jobsWithoutEmbeddings = await listJobsWithoutEmbeddings(50)
  const embeddingBatchSize = 5

  for (let index = 0; index < jobsWithoutEmbeddings.length; index += embeddingBatchSize) {
    const batch = jobsWithoutEmbeddings.slice(index, index + embeddingBatchSize)
    await Promise.allSettled(
      batch.map((job) => ensureJobEmbedding(job))
    )
  }

  const similarJobs = await findSimilarJobsForUser({
    userId: input.userId,
    limit: input.limit || 10,
  })

  const results: Array<{
    jobId: string
    title: string
    success: boolean
    score: number | null
  }> = []

  const matchBatchSize = 3
  for (let index = 0; index < similarJobs.jobs.length; index += matchBatchSize) {
    const batch = similarJobs.jobs.slice(index, index + matchBatchSize)
    const batchResults = await Promise.allSettled(
      batch.map(async (job) => {
        const match = await calculateMatchForUser({
          userId: input.userId,
          jobId: job.id,
        })

        return {
          jobId: job.id,
          title: job.title,
          success: true,
          score: match.result.score,
        }
      })
    )

    results.push(
      ...batchResults.map((entry, batchIndex) => {
        if (entry.status === "fulfilled") {
          return entry.value
        }

        const fallbackJob = batch[batchIndex]
        return {
          jobId: fallbackJob.id,
          title: fallbackJob.title,
          success: false,
          score: null,
        }
      })
    )
  }

  return results
}
