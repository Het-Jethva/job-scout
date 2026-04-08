import {
  generateEmbedding,
  extractJobRequirements,
  generateMatchExplanation,
  type ResumeAnalysis,
} from "./openrouter"

export interface MatchResult {
  score: number // 0-100
  similarityScore: number // Raw cosine similarity
  matchedSkills: string[]
  partialMatches: string[]
  missingSkills: string[]
  explanation: string
}

export interface JobRequirementSnapshot {
  skills: string[]
  requirements: string[]
}

export interface SkillMatch {
  matched: string[]
  partial: string[]
  missing: string[]
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  if (magnitude === 0) return 0

  return dotProduct / magnitude
}

/**
 * Normalize skill names for comparison
 */
function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, "")
    .trim()
}

/**
 * Check if two skills are a match or partial match
 */
function skillMatchType(
  resumeSkill: string,
  jobSkill: string
): "exact" | "partial" | "none" {
  const normResume = normalizeSkill(resumeSkill)
  const normJob = normalizeSkill(jobSkill)

  // Exact match
  if (normResume === normJob) return "exact"

  // Common variations
  const variations: Record<string, string[]> = {
    javascript: ["js", "es6", "es2015", "ecmascript"],
    typescript: ["ts"],
    python: ["py", "python3"],
    react: ["reactjs", "react.js"],
    vue: ["vuejs", "vue.js"],
    angular: ["angularjs", "angular.js"],
    node: ["nodejs", "node.js"],
    postgresql: ["postgres", "psql"],
    mongodb: ["mongo"],
    kubernetes: ["k8s"],
    "amazon web services": ["aws"],
    "google cloud": ["gcp", "googlecloud"],
    "machine learning": ["ml"],
    "artificial intelligence": ["ai"],
    "continuous integration": ["ci"],
    "continuous deployment": ["cd"],
  }

  // Check variations
  for (const [main, alts] of Object.entries(variations)) {
    const allForms = [main, ...alts].map(normalizeSkill)
    if (allForms.includes(normResume) && allForms.includes(normJob)) {
      return "exact"
    }
  }

  // Partial match (one contains the other)
  if (normResume.includes(normJob) || normJob.includes(normResume)) {
    return "partial"
  }

  return "none"
}

/**
 * Match resume skills against job requirements
 */
export function matchSkills(
  resumeSkills: string[],
  jobSkills: string[]
): SkillMatch {
  const matched: string[] = []
  const partial: string[] = []
  const missing: string[] = []

  const matchedJobSkills = new Set<string>()

  for (const jobSkill of jobSkills) {
    let found = false

    for (const resumeSkill of resumeSkills) {
      const matchType = skillMatchType(resumeSkill, jobSkill)

      if (matchType === "exact") {
        matched.push(jobSkill)
        matchedJobSkills.add(jobSkill)
        found = true
        break
      } else if (matchType === "partial") {
        partial.push(jobSkill)
        matchedJobSkills.add(jobSkill)
        found = true
        break
      }
    }

    if (!found) {
      missing.push(jobSkill)
    }
  }

  return { matched, partial, missing }
}

/**
 * Calculate match score between resume and job
 */
export function calculateMatchScore(
  skillMatch: SkillMatch,
  similarityScore: number
): number {
  const totalJobSkills =
    skillMatch.matched.length +
    skillMatch.partial.length +
    skillMatch.missing.length

  if (totalJobSkills === 0) {
    // If no specific skills, rely more on similarity
    return Math.round(similarityScore * 100)
  }

  // Skill match component (65% weight)
  const exactMatchWeight = 1.0
  const partialMatchWeight = 0.55

  const skillScore =
    (skillMatch.matched.length * exactMatchWeight +
      skillMatch.partial.length * partialMatchWeight) /
    totalJobSkills

  // Semantic similarity component (35% weight)
  const semanticScore = similarityScore

  // Combined score with soft floor to avoid overly low scores
  const combinedScore = skillScore * 0.65 + semanticScore * 0.35

  return Math.min(100, Math.max(5, Math.round(combinedScore * 100)))
}

function normalizeSkillName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, "")
    .trim()
}

function dedupeSkills(values: string[]): string[] {
  const deduped = new Map<string, string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeSkillName(trimmed)
    if (!key) continue
    if (!deduped.has(key)) {
      deduped.set(key, trimmed)
    }
  }
  return [...deduped.values()]
}


/**
 * Full match analysis between resume and job
 */
export async function analyzeMatch(
  resumeText: string,
  resumeAnalysis: ResumeAnalysis,
  resumeEmbedding: number[],
  jobDescription: string,
  jobEmbedding: number[],
  jobRequirementsInput?: JobRequirementSnapshot
): Promise<MatchResult> {
  // Calculate semantic similarity
  const similarityScore = cosineSimilarity(resumeEmbedding, jobEmbedding)

  // Extract job requirements
  const jobRequirements = jobRequirementsInput ??
    await extractJobRequirements(jobDescription)

  // Match skills
  const resumeSkillNames = dedupeSkills(
    resumeAnalysis.skills.map((s) => s.name)
  )
  const jobSkillNames = dedupeSkills(jobRequirements.skills)
  const skillMatch = matchSkills(resumeSkillNames, jobSkillNames)

  // Penalty for missing critical skills
  const missingRatio =
    jobSkillNames.length > 0
      ? skillMatch.missing.length / jobSkillNames.length
      : 0

  // Calculate overall score
  const baseScore = calculateMatchScore(skillMatch, similarityScore)
  const penalty = Math.min(20, Math.round(missingRatio * 25))
  const score = Math.max(0, baseScore - penalty)

  // Generate explanation
  const explanation = await generateMatchExplanation(
    resumeAnalysis,
    jobRequirements,
    score,
    skillMatch.missing
  )

  return {
    score,
    similarityScore,
    matchedSkills: skillMatch.matched,
    partialMatches: skillMatch.partial,
    missingSkills: skillMatch.missing,
    explanation,
  }
}

/**
 * Generate embedding for job and analyze if none exists
 */
export async function processJobForMatching(jobDescription: string): Promise<{
  embedding: number[]
  skills: string[]
  requirements: string[]
}> {
  const [embedding, requirements] = await Promise.all([
    generateEmbedding(jobDescription),
    extractJobRequirements(jobDescription),
  ])

  return {
    embedding,
    skills: dedupeSkills(requirements.skills),
    requirements: requirements.requirements,
  }
}

/**
 * Batch match resume against multiple jobs
 */
export async function batchMatchJobs(
  resumeText: string,
  resumeAnalysis: ResumeAnalysis,
  resumeEmbedding: number[],
  jobs: Array<{
    id: string
    description: string
    embedding: number[]
  }>
): Promise<
  Array<{
    jobId: string
    score: number
    similarityScore: number
    matchedSkills: string[]
    missingSkills: string[]
  }>
> {
  const results = await Promise.all(
    jobs.map(async (job) => {
      try {
        const result = await analyzeMatch(
          resumeText,
          resumeAnalysis,
          resumeEmbedding,
          job.description,
          job.embedding
        )

        return {
          jobId: job.id,
          score: result.score,
          similarityScore: result.similarityScore,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
        }
      } catch (_error) {
        return {
          jobId: job.id,
          score: 0,
          similarityScore: 0,
          matchedSkills: [],
          missingSkills: [],
        }
      }
    })
  )

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score)
}
