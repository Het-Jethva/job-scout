"use server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { analyzeMatch } from "@/lib/services/matching-engine"
import { extractResumeData, generateEmbedding } from "@/lib/services/openrouter"
import { jobIdSchema } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { RATE_LIMITS, checkRateLimit, rateLimitError } from "@/lib/rate-limit"

/**
 * Calculate match between user's resume and a specific job
 */
export async function calculateJobMatch(jobId: string) {
  // Validate input
  const validation = jobIdSchema.safeParse(jobId)
  if (!validation.success) {
    return { success: false, error: "Invalid job ID" }
  }

  const session = await requireAuth()

  // Apply rate limiting for AI-heavy operations
  const rateLimitResult = checkRateLimit(`user:${session.user.id}`, RATE_LIMITS.aiOperation)
  if (!rateLimitResult.success) {
    return rateLimitError(rateLimitResult)
  }

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

  // Get job
  const job = await db.job.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    return { success: false, error: "Job not found" }
  }

  try {
    // Get or generate resume embedding
    let resumeEmbedding: number[]
    const resumeEmbeddingResult = await db.$queryRaw<
      Array<{ embedding: string | null }>
    >`
      SELECT embedding::text as embedding FROM "Resume" WHERE id = ${resume.id}
    `

    if (resumeEmbeddingResult[0]?.embedding) {
      // Parse vector string format: [0.1,0.2,...]
      try {
        resumeEmbedding = JSON.parse(resumeEmbeddingResult[0].embedding)
      } catch {
        // If parsing fails, regenerate embedding
        resumeEmbedding = await generateEmbedding(resume.rawText)
        const embeddingLiteral = `[${resumeEmbedding.join(",")}]`
        await db.$executeRaw`
          UPDATE "Resume"
          SET embedding = ${embeddingLiteral}::vector
          WHERE id = ${resume.id}
        `
      }
    } else {
      resumeEmbedding = await generateEmbedding(resume.rawText)
      const embeddingLiteral = `[${resumeEmbedding.join(",")}]`
      await db.$executeRaw`
        UPDATE "Resume"
        SET embedding = ${embeddingLiteral}::vector
        WHERE id = ${resume.id}
      `
    }

    // Get or generate job embedding
    let jobEmbedding: number[]
    const jobEmbeddingResult = await db.$queryRaw<
      Array<{ embedding: string | null }>
    >`
      SELECT embedding::text as embedding FROM "Job" WHERE id = ${job.id}
    `

    if (jobEmbeddingResult[0]?.embedding) {
      // Parse vector string format: [0.1,0.2,...]
      try {
        jobEmbedding = JSON.parse(jobEmbeddingResult[0].embedding)
      } catch {
        // If parsing fails, regenerate embedding
        jobEmbedding = await generateEmbedding(job.description)
        const embeddingLiteral = `[${jobEmbedding.join(",")}]`
        await db.$executeRaw`
          UPDATE "Job"
          SET embedding = ${embeddingLiteral}::vector
          WHERE id = ${job.id}
        `
      }
    } else {
      jobEmbedding = await generateEmbedding(job.description)
      const embeddingLiteral = `[${jobEmbedding.join(",")}]`
      await db.$executeRaw`
        UPDATE "Job"
        SET embedding = ${embeddingLiteral}::vector
        WHERE id = ${job.id}
      `
    }

    // Extract resume analysis
    let resumeAnalysis: Awaited<ReturnType<typeof extractResumeData>>
    if (resume.parsedData && typeof resume.parsedData === "object") {
      resumeAnalysis = resume.parsedData as unknown as Awaited<
        ReturnType<typeof extractResumeData>
      >
    } else {
      resumeAnalysis = await extractResumeData(resume.rawText)
    }

    // Perform match analysis
    const matchResult = await analyzeMatch(
      resume.rawText,
      resumeAnalysis,
      resumeEmbedding,
      job.description,
      jobEmbedding
    )

    // Save or update match
    const match = await db.match.upsert({
      where: {
        resumeId_jobId: {
          resumeId: resume.id,
          jobId: job.id,
        },
      },
      update: {
        score: matchResult.score,
        similarityScore: matchResult.similarityScore,
        skillMatches: {
          matched: matchResult.matchedSkills,
          partial: matchResult.partialMatches,
          missing: matchResult.missingSkills,
        },
        skillGaps: matchResult.missingSkills,
        explanation: matchResult.explanation,
      },
      create: {
        userId: session.user.id,
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
      },
    })

    revalidatePath("/matches")
    revalidatePath(`/jobs/${jobId}`)

    return {
      success: true,
      match: {
        id: match.id,
        score: match.score,
        matchedSkills: matchResult.matchedSkills,
        partialMatches: matchResult.partialMatches,
        missingSkills: matchResult.missingSkills,
        explanation: matchResult.explanation,
      },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to calculate match",
    }
  }
}

/**
 * Get match for a specific job
 */
export async function getJobMatch(jobId: string) {
  // Validate input
  const validation = jobIdSchema.safeParse(jobId)
  if (!validation.success) {
    return null
  }

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

  return db.match.findUnique({
    where: {
      resumeId_jobId: {
        resumeId: resume.id,
        jobId,
      },
    },
  })
}

/**
 * Get all matches for user
 */
export async function getUserMatches(options?: {
  limit?: number
  minScore?: number
}) {
  const session = await requireAuth()
  const limit = options?.limit || 50
  const minScore = options?.minScore || 0

  const matches = await db.match.findMany({
    where: {
      userId: session.user.id,
      score: { gte: minScore },
    },
    orderBy: { score: "desc" },
    take: limit,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          companyLogo: true,
          location: true,
          isRemote: true,
          salary: true,
          applyUrl: true,
        },
      },
    },
  })

  return matches
}

/**
 * Find similar jobs using vector search
 */
export async function findSimilarJobs(options?: { limit?: number }) {
  const session = await requireAuth()
  const limit = options?.limit || 20

  // Get user's active resume
  const resume = await db.resume.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: { id: true },
  })

  if (!resume) {
    return { jobs: [], message: "No active resume found" }
  }

  // Find similar jobs using cosine similarity
  type SimilarJob = {
    id: string
    title: string
    company: string
    company_logo: string | null
    location: string
    is_remote: boolean
    salary: string | null
    apply_url: string
    published_at: Date
    similarity: number
  }

  const similarJobs = await db.$queryRaw<SimilarJob[]>`
    SELECT
      j.id,
      j.title,
      j.company,
      j."companyLogo" as company_logo,
      j.location,
      j."isRemote" as is_remote,
      j.salary,
      j."applyUrl" as apply_url,
      j."publishedAt" as published_at,
      1 - (j.embedding <=> r.embedding) as similarity
    FROM "Job" j
    CROSS JOIN "Resume" r
    WHERE r.id = ${resume.id}
      AND j."isActive" = true
      AND j.embedding IS NOT NULL
      AND r.embedding IS NOT NULL
    ORDER BY j.embedding <=> r.embedding
    LIMIT ${limit}
  `

  return {
    jobs: similarJobs.map((j: SimilarJob) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      companyLogo: j.company_logo,
      location: j.location,
      isRemote: j.is_remote,
      salary: j.salary,
      applyUrl: j.apply_url,
      publishedAt: j.published_at,
      similarity: Math.round(j.similarity * 100),
    })),
  }
}

/**
 * Batch calculate matches for top similar jobs
 */
export async function calculateBatchMatches(limit = 10) {
  const session = await requireAuth()

  // Ensure user has an active resume with embedding
  const resume = await db.resume.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: { id: true, rawText: true },
  })

  if (!resume) {
    return []
  }

  // Check if resume has embedding, generate if not
  const resumeEmbeddingResult = await db.$queryRaw<
    Array<{ has_embedding: boolean }>
  >`
    SELECT (embedding IS NOT NULL) as has_embedding FROM "Resume" WHERE id = ${resume.id}
  `

  if (!resumeEmbeddingResult[0]?.has_embedding) {
    // Generate embedding for resume
    const embedding = await generateEmbedding(resume.rawText)
    const embeddingLiteral = `[${embedding.join(",")}]`
    await db.$executeRaw`
      UPDATE "Resume"
      SET embedding = ${embeddingLiteral}::vector
      WHERE id = ${resume.id}
    `
  }

  // Generate embeddings for jobs that don't have them (batch of 50)
  const jobsWithoutEmbeddings = await db.$queryRaw<
    Array<{ id: string; description: string }>
  >`
    SELECT id, description FROM "Job"
    WHERE embedding IS NULL AND "isActive" = true
    LIMIT 50
  `

  // Process embeddings in parallel (batch of 5 at a time to avoid rate limits)
  const BATCH_SIZE = 5
  for (let i = 0; i < jobsWithoutEmbeddings.length; i += BATCH_SIZE) {
    const batch = jobsWithoutEmbeddings.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(
      batch.map(async (job) => {
        try {
          const embedding = await generateEmbedding(job.description)
          const embeddingLiteral = `[${embedding.join(",")}]`
          await db.$executeRaw`
            UPDATE "Job"
            SET embedding = ${embeddingLiteral}::vector
            WHERE id = ${job.id}
          `
        } catch (_error) {
          // Continue with next job if one fails
        }
      })
    )
  }

  // Get similar jobs
  const { jobs } = await findSimilarJobs({ limit })

  // Process matches in parallel (batch of 3 at a time to avoid overwhelming the API)
  const results = []
  const MATCH_BATCH_SIZE = 3

  // Type for batch match results
  interface MatchBatchResult {
    jobId: string
    title: string
    success: boolean
    score: number | null
  }

  for (let i = 0; i < jobs.length; i += MATCH_BATCH_SIZE) {
    const batch = jobs.slice(i, i + MATCH_BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map(async (job): Promise<MatchBatchResult> => {
        const result = await calculateJobMatch(job.id)
        return {
          jobId: job.id,
          title: job.title,
          success: result.success,
          score: result.success ? result.match?.score ?? null : null,
        }
      })
    )

    // Add fulfilled results
    results.push(
      ...batchResults
        .filter((r): r is PromiseFulfilledResult<MatchBatchResult> => r.status === "fulfilled")
        .map((r) => r.value)
    )
  }

  // Revalidate the matches page to ensure it updates
  revalidatePath("/matches")

  return results
}
