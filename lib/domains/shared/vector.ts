import { db } from "@/lib/db"
import { generateEmbedding } from "@/lib/services/openrouter"
import { safeParseJson } from "@/lib/serialization"

type VectorRow = {
  embedding: string | null
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`
}

function parseVector(embedding: string | null | undefined): number[] | null {
  if (!embedding) {
    return null
  }

  const parsed = safeParseJson<unknown>(embedding, null)
  return Array.isArray(parsed) ? parsed : null
}

async function findResumeEmbeddingById(resumeId: string): Promise<number[] | null> {
  const rows = await db.$queryRaw<VectorRow[]>`
    SELECT embedding::text as embedding FROM "Resume" WHERE id = ${resumeId}
  `

  return parseVector(rows[0]?.embedding)
}

export async function saveResumeEmbedding(resumeId: string, embedding: number[]) {
  const embeddingLiteral = toVectorLiteral(embedding)

  await db.$executeRaw`
    UPDATE "Resume"
    SET embedding = ${embeddingLiteral}::vector
    WHERE id = ${resumeId}
  `
}

async function findJobEmbeddingById(jobId: string): Promise<number[] | null> {
  const rows = await db.$queryRaw<VectorRow[]>`
    SELECT embedding::text as embedding FROM "Job" WHERE id = ${jobId}
  `

  return parseVector(rows[0]?.embedding)
}

export async function saveJobEmbedding(jobId: string, embedding: number[]) {
  const embeddingLiteral = toVectorLiteral(embedding)

  await db.$executeRaw`
    UPDATE "Job"
    SET embedding = ${embeddingLiteral}::vector
    WHERE id = ${jobId}
  `
}

export async function ensureResumeEmbedding(input: {
  resumeId: string
  resumeText: string
}): Promise<number[]> {
  const storedEmbedding = await findResumeEmbeddingById(input.resumeId)
  if (storedEmbedding) {
    return storedEmbedding
  }

  const embedding = await generateEmbedding(input.resumeText)
  await saveResumeEmbedding(input.resumeId, embedding)
  return embedding
}

export async function ensureJobEmbedding(input: {
  jobId: string
  jobDescription: string
}): Promise<number[]> {
  const storedEmbedding = await findJobEmbeddingById(input.jobId)
  if (storedEmbedding) {
    return storedEmbedding
  }

  const embedding = await generateEmbedding(input.jobDescription)
  await saveJobEmbedding(input.jobId, embedding)
  return embedding
}
