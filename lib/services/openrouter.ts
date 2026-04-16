/**
 * OpenRouter AI Service
 * Uses OpenRouter API with free models for AI features
 */

import { publicEnv } from "@/lib/config/public-env"
import { getAiEnv } from "@/lib/config/server-env"
import {
  sanitizeTailoredInlineText,
  sanitizeTailoredKeywords,
  sanitizeTailoredResumeChanges,
  sanitizeTailoredResumeText,
} from "@/lib/services/tailored-resume-sanitizer"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "openai/gpt-oss-120b" // Free model

interface OpenRouterMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string
    }
  }[]
}

// Circuit breaker state
interface CircuitBreakerState {
  failures: number
  lastFailure: number
  isOpen: boolean
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
}

const CIRCUIT_BREAKER_THRESHOLD = 5 // failures before opening circuit
const CIRCUIT_BREAKER_RESET_MS = 60_000 // 1 minute before retry

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff with jitter
 */
function getBackoffDelay(attempt: number, baseDelayMs = 1000): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * exponentialDelay // 0-30% jitter
  return Math.min(exponentialDelay + jitter, 30000) // Max 30 seconds
}

/**
 * Check if error is retryable (transient)
 */
function isRetryableError(error: Error, statusCode?: number): boolean {
  if (statusCode) {
    // Retry on server errors and rate limits
    return statusCode >= 500 || statusCode === 429 || statusCode === 408
  }
  // Retry on network errors
  const message = error.message.toLowerCase()
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnrefused") ||
    message.includes("econnreset") ||
    message.includes("socket hang up")
  )
}

/**
 * Call OpenRouter API for chat completions with retry logic
 */
async function callOpenRouter(
  messages: OpenRouterMessage[],
  jsonMode: boolean = false,
  maxRetries: number = 3,
  temperature: number = 0.7
): Promise<string> {
  // Check circuit breaker
  if (circuitBreaker.isOpen) {
    const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailure
    if (timeSinceLastFailure < CIRCUIT_BREAKER_RESET_MS) {
      throw new Error(
        "AI service temporarily unavailable. Please try again in a minute."
      )
    }
    // Reset circuit breaker for retry
    circuitBreaker.isOpen = false
    circuitBreaker.failures = 0
  }

  const { OPENROUTER_API_KEY: apiKey } = getAiEnv()
  const API_TIMEOUT_MS = 30000 // 30 seconds

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Add delay for retries (not first attempt)
    if (attempt > 0) {
      const delay = getBackoffDelay(attempt - 1)
      await sleep(delay)
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": publicEnv.NEXT_PUBLIC_APP_URL,
          "X-Title": "Job Scout",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature,
          max_tokens: 4096,
          ...(jsonMode && { response_format: { type: "json_object" } }),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = `OpenRouter API error: ${response.status}`
        try {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.error?.message) {
            errorMessage = errorData.error.message
          }
        } catch {
          // Ignore JSON parse errors for error response
        }

        // Check if retryable
        if (isRetryableError(new Error(errorMessage), response.status)) {
          lastError = new Error(errorMessage)
          continue // Retry
        }

        // Non-retryable errors
        if (response.status === 401) {
          throw new Error(
            "Invalid API key. Please check your OPENROUTER_API_KEY."
          )
        }
        if (response.status === 400) {
          throw new Error(`Invalid request: ${errorMessage}`)
        }
        throw new Error(errorMessage)
      }

      const data = (await response.json()) as OpenRouterResponse

      if (!data.choices || data.choices.length === 0) {
        throw new Error("No response choices from AI service")
      }

      const content = data.choices[0]?.message?.content
      if (!content) {
        throw new Error("Empty response content from AI service")
      }

      // Success - reset circuit breaker
      circuitBreaker.failures = 0
      circuitBreaker.isOpen = false

      return content
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = new Error("AI service request timed out. Please try again.")
          continue // Retry on timeout
        }

        // Check if retryable network error
        if (isRetryableError(error)) {
          lastError = error
          continue // Retry
        }

        // Non-retryable error - throw immediately
        throw error
      }
      throw error
    }
  }

  // All retries exhausted - update circuit breaker
  circuitBreaker.failures++
  circuitBreaker.lastFailure = Date.now()
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true
  }

  throw lastError || new Error("AI service request failed after retries")
}


/**
 * Parse JSON from response, handling markdown code blocks
 */
function parseJsonResponse<T>(text: string): T {
  if (!text || text.trim().length === 0) {
    throw new Error("Empty response from AI service")
  }

  // Remove markdown code blocks if present
  let cleaned = text.trim()
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  if (cleaned.length === 0) {
    throw new Error("No valid JSON content in AI response")
  }

  try {
    return JSON.parse(cleaned) as T
  } catch (parseError) {
    const objectStart = cleaned.indexOf("{")
    const objectEnd = cleaned.lastIndexOf("}")

    if (objectStart !== -1 && objectEnd > objectStart) {
      const candidate = cleaned.slice(objectStart, objectEnd + 1)
      try {
        return JSON.parse(candidate) as T
      } catch {
        // Fall through to the original parse error below.
      }
    }

    console.error("JSON parse error. Response text:", cleaned.substring(0, 500))
    throw new Error(
      `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
    )
  }
}

// ============ Interfaces ============

export interface ExtractedSkill {
  name: string
  category: string
  level?: string
}

export interface ExtractedExperience {
  title: string
  company: string
  duration: string
  responsibilities: string[]
}

export interface ExtractedEducation {
  degree: string
  institution: string
  year: string
  field: string
}

export interface ResumeAnalysis {
  skills: ExtractedSkill[]
  keywords: string[]
  experience: ExtractedExperience[]
  education: ExtractedEducation[]
  summary: string
  yearsOfExperience: number
}

interface SkillCatalogItem {
  name: string
  category: string
  aliases: string[]
}

const SKILL_CATALOG: SkillCatalogItem[] = [
  {
    name: "TypeScript",
    category: "programming",
    aliases: ["typescript"],
  },
  {
    name: "JavaScript",
    category: "programming",
    aliases: ["javascript"],
  },
  {
    name: "Python",
    category: "programming",
    aliases: ["python"],
  },
  {
    name: "Java",
    category: "programming",
    aliases: ["java"],
  },
  {
    name: "C++",
    category: "programming",
    aliases: ["c++"],
  },
  {
    name: "C#",
    category: "programming",
    aliases: ["c#"],
  },
  {
    name: "Go",
    category: "programming",
    aliases: ["golang", "go language"],
  },
  {
    name: "React",
    category: "framework",
    aliases: ["react", "react.js", "reactjs"],
  },
  {
    name: "Next.js",
    category: "framework",
    aliases: ["next.js", "nextjs"],
  },
  {
    name: "Node.js",
    category: "framework",
    aliases: ["node.js", "nodejs"],
  },
  {
    name: "Express",
    category: "framework",
    aliases: ["express", "express.js", "expressjs"],
  },
  {
    name: "Django",
    category: "framework",
    aliases: ["django"],
  },
  {
    name: "Flask",
    category: "framework",
    aliases: ["flask"],
  },
  {
    name: "PostgreSQL",
    category: "database",
    aliases: ["postgresql", "postgres"],
  },
  {
    name: "MySQL",
    category: "database",
    aliases: ["mysql"],
  },
  {
    name: "MongoDB",
    category: "database",
    aliases: ["mongodb", "mongo db"],
  },
  {
    name: "Redis",
    category: "database",
    aliases: ["redis"],
  },
  {
    name: "Prisma",
    category: "tool",
    aliases: ["prisma"],
  },
  {
    name: "Docker",
    category: "devops",
    aliases: ["docker"],
  },
  {
    name: "Kubernetes",
    category: "devops",
    aliases: ["kubernetes", "k8s"],
  },
  {
    name: "AWS",
    category: "cloud",
    aliases: ["aws", "amazon web services"],
  },
  {
    name: "GCP",
    category: "cloud",
    aliases: ["gcp", "google cloud"],
  },
  {
    name: "Azure",
    category: "cloud",
    aliases: ["azure", "microsoft azure"],
  },
  {
    name: "Git",
    category: "tool",
    aliases: ["git"],
  },
  {
    name: "CI/CD",
    category: "devops",
    aliases: ["ci/cd", "continuous integration", "continuous deployment"],
  },
  {
    name: "REST APIs",
    category: "other",
    aliases: ["rest api", "restful api", "apis"],
  },
  {
    name: "GraphQL",
    category: "other",
    aliases: ["graphql"],
  },
]

function normalizeWhitespaceText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]+/g, " ")
}

function dedupeStrings(values: string[]): string[] {
  const deduped = new Map<string, string>()

  for (const value of values) {
    const cleaned = value.trim()
    if (!cleaned) {
      continue
    }

    const key = cleaned.toLowerCase()
    if (!deduped.has(key)) {
      deduped.set(key, cleaned)
    }
  }

  return [...deduped.values()]
}

function aliasMatchesText(text: string, alias: string): boolean {
  const normalizedAlias = alias.trim().toLowerCase()
  if (!normalizedAlias) {
    return false
  }

  if (/^[a-z0-9]+$/.test(normalizedAlias)) {
    const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`\\b${escaped}\\b`, "i").test(text)
  }

  return text.includes(normalizedAlias)
}

function normalizeSkillKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, "")
    .trim()
}

function detectSkillsFromText(text: string): ExtractedSkill[] {
  const normalizedText = normalizeWhitespaceText(text).toLowerCase()

  return SKILL_CATALOG.filter((skill) =>
    skill.aliases.some((alias) => aliasMatchesText(normalizedText, alias))
  ).map((skill) => ({
    name: skill.name,
    category: skill.category,
    level: undefined,
  }))
}

function extractSectionContent(
  text: string,
  headings: string[]
): string | null {
  const escapedHeadings = headings.map((heading) =>
    heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  )
  const pattern = new RegExp(
    `(?:^|\\n)(?:${escapedHeadings.join("|")})\\s*\\n([\\s\\S]*?)(?:\\n\\s*\\n|$)`,
    "i"
  )
  const match = pattern.exec(text)

  return match?.[1]?.trim() || null
}

function extractSummaryFromText(text: string): string {
  const summarySection = extractSectionContent(text, [
    "summary",
    "professional summary",
    "profile",
    "objective",
  ])

  if (summarySection) {
    return summarySection.split("\n").slice(0, 4).join(" ").trim()
  }

  const lines = normalizeWhitespaceText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
  return lines.join(" ").slice(0, 320).trim()
}

function extractExperienceFromText(text: string): ExtractedExperience[] {
  const lines = normalizeWhitespaceText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const experiences: ExtractedExperience[] = []
  const rolePattern =
    /^([A-Za-z][A-Za-z0-9/&(),.' -]{1,80})\s*(?:at|@|,|-)+\s*([A-Za-z0-9&(),.' -]{2,80})(?:\s*\(([^)]+)\))?$/i

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lowered = line.toLowerCase()

    if (
      lowered === "experience" ||
      lowered === "work experience" ||
      lowered === "employment"
    ) {
      continue
    }

    const roleMatch = rolePattern.exec(line)
    if (!roleMatch) {
      continue
    }

    const responsibilities: string[] = []
    for (let offset = 1; offset <= 5; offset += 1) {
      const nextLine = lines[index + offset]
      if (!nextLine) {
        break
      }

      if (/^[-*•]/.test(nextLine)) {
        responsibilities.push(nextLine.replace(/^[-*•]\s*/, "").trim())
      } else if (rolePattern.test(nextLine)) {
        break
      }
    }

    experiences.push({
      title: roleMatch[1].trim(),
      company: roleMatch[2].trim(),
      duration: roleMatch[3]?.trim() || "",
      responsibilities: responsibilities.slice(0, 5),
    })

    if (experiences.length >= 5) {
      break
    }
  }

  return experiences
}

function extractEducationFromText(text: string): ExtractedEducation[] {
  const lines = normalizeWhitespaceText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const education: ExtractedEducation[] = []

  for (const line of lines) {
    if (!/(bachelor|master|phd|degree|university|college|b\.s\.|m\.s\.)/i.test(line)) {
      continue
    }

    const yearMatch = /(19|20)\d{2}/.exec(line)
    const parts = line.split(",").map((part) => part.trim())
    const degree = parts[0] || "Degree"
    const institution = parts[1] || parts[0] || "Institution"
    const fieldMatch = /in\s+([A-Za-z0-9&/ -]{3,60})/i.exec(line)

    education.push({
      degree,
      institution,
      year: yearMatch?.[0] || "",
      field: fieldMatch?.[1]?.trim() || "",
    })

    if (education.length >= 4) {
      break
    }
  }

  return education
}

function estimateYearsOfExperience(
  text: string,
  experience: ExtractedExperience[]
): number {
  const explicitMatches = Array.from(text.matchAll(/(\d{1,2})\+?\s+years?/gi))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 50)

  if (explicitMatches.length > 0) {
    return Math.max(...explicitMatches)
  }

  if (experience.length > 0) {
    return Math.min(30, experience.length * 2)
  }

  return 0
}

function createFallbackResumeAnalysis(resumeText: string): ResumeAnalysis {
  const summary = extractSummaryFromText(resumeText)
  const skills = detectSkillsFromText(resumeText)
  const experience = extractExperienceFromText(resumeText)
  const education = extractEducationFromText(resumeText)
  const keywords = dedupeStrings(skills.map((skill) => skill.name)).slice(0, 20)
  const yearsOfExperience = estimateYearsOfExperience(resumeText, experience)

  return {
    skills,
    keywords,
    experience,
    education,
    summary,
    yearsOfExperience,
  }
}

function inferExperienceLevel(yearsRequired: number): string {
  if (yearsRequired >= 12) return "executive"
  if (yearsRequired >= 8) return "lead"
  if (yearsRequired >= 5) return "senior"
  if (yearsRequired >= 2) return "mid"
  return "entry"
}

function createFallbackJobRequirements(jobDescription: string): {
  skills: string[]
  requirements: string[]
  niceToHave: string[]
  experienceLevel: string
} {
  const normalized = normalizeWhitespaceText(jobDescription)
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const skills = dedupeStrings(
    detectSkillsFromText(jobDescription).map((skill) => skill.name)
  )

  const requirements = dedupeStrings(
    lines.filter((line) =>
      /(must|required|minimum|proficient|experience with|strong understanding)/i.test(
        line
      )
    )
  ).slice(0, 12)

  const niceToHave = dedupeStrings(
    lines.filter((line) =>
      /(preferred|nice to have|bonus|plus|good to have)/i.test(line)
    )
  ).slice(0, 10)

  const yearsRequiredMatch = /(\d{1,2})\+?\s+years?/i.exec(normalized)
  const yearsRequired = Number(yearsRequiredMatch?.[1] || "0")

  return {
    skills,
    requirements,
    niceToHave,
    experienceLevel: inferExperienceLevel(yearsRequired),
  }
}

function createFallbackTailoredResumeResult(
  originalResumeText: string,
  resumeAnalysis: ResumeAnalysis,
  jobTitle: string,
  requiredSkills: string[]
): TailoredResumeResult {
  const cleanedOriginal =
    sanitizeTailoredResumeText(originalResumeText || "") || originalResumeText.trim()
  const resumeSkills = dedupeStrings(
    resumeAnalysis.skills.map((skill) => sanitizeTailoredInlineText(skill.name))
  )

  const requiredSkillSet = new Set(
    requiredSkills.map((skill) => normalizeSkillKey(skill))
  )

  const prioritizedSkills = resumeSkills.filter((skill) =>
    requiredSkillSet.has(normalizeSkillKey(skill))
  )

  const finalPrioritizedSkills =
    prioritizedSkills.length > 0 ? prioritizedSkills : resumeSkills

  const addedKeywords = finalPrioritizedSkills.slice(0, 12)

  const summaryBase =
    sanitizeTailoredInlineText(resumeAnalysis.summary || "") ||
    "Experienced software professional with proven project delivery."

  const summary = addedKeywords.length > 0
    ? `${summaryBase} Tailored for ${jobTitle} with emphasis on ${addedKeywords
        .slice(0, 5)
        .join(", ")}.`
    : `${summaryBase} Tailored for ${jobTitle}.`

  let optimizedText = cleanedOriginal
  if (!optimizedText) {
    optimizedText = `## Professional Summary\n${summary}`
  }

  if (addedKeywords.length > 0 && !/##\s*Technical Skills/i.test(optimizedText)) {
    optimizedText = `${optimizedText}\n\n## Technical Skills\n${addedKeywords
      .map((keyword) => `- ${keyword}`)
      .join("\n")}`
  }

  return {
    optimizedText,
    changes: [
      {
        section: "Professional Summary",
        original: sanitizeTailoredResumeText(resumeAnalysis.summary || ""),
        modified: summary,
        reason: "Emphasized existing strengths for the target role.",
      },
    ],
    addedKeywords,
    atsScore: clampAtsScore(70 + Math.min(25, addedKeywords.length * 2)),
    summary,
    prioritizedSkills: finalPrioritizedSkills.slice(0, 12),
    experience: resumeAnalysis.experience.slice(0, 4).map((entry) => ({
      title: entry.title,
      company: entry.company,
      description: entry.responsibilities.join("\n"),
    })),
  }
}

// ============ AI Functions ============

/**
 * Extract skills and structured data from resume text
 */
export async function extractResumeData(
  resumeText: string
): Promise<ResumeAnalysis> {
  const systemPrompt = `You are an elite resume analyzer and career intelligence specialist with 15+ years of experience in technical recruiting, HR analytics, and talent acquisition across Fortune 500 companies and top tech firms.

Your expertise includes:
- Deep understanding of technical skill taxonomies across software engineering, data science, DevOps, cloud computing, and emerging technologies
- Mastery of industry-standard naming conventions (e.g., "React.js" not "react", "Amazon Web Services (AWS)" with common abbreviations)
- Ability to detect implied skills from project descriptions, job responsibilities, and achievements
- Understanding of skill progression and proficiency indicators from context
- Recognition of transferable skills and soft skills from accomplishments

You MUST respond with valid JSON only, no other text or markdown formatting.`

  const userPrompt = `Analyze this resume with expert precision and extract comprehensive structured information.

## EXTRACTION GUIDELINES:

### Skills Extraction (CRITICAL):
1. **Explicitly mentioned skills**: Extract all technologies, tools, frameworks, languages directly stated
2. **Implied skills**: Infer skills from context (e.g., "deployed microservices on Kubernetes" implies Docker, containerization, CI/CD knowledge)
3. **Transferable skills**: Identify soft skills from achievements (e.g., "led team of 5" implies leadership, team management)
4. **Skill naming**: Use industry-standard names with common abbreviations in parentheses where applicable
5. **Skill level determination**:
   - **expert**: 5+ years experience, led projects, trained others, or explicitly stated as expert/senior
   - **advanced**: 3-5 years, significant project involvement, production deployments
   - **intermediate**: 1-3 years, multiple projects, demonstrated proficiency
   - **beginner**: < 1 year, coursework, certifications, or limited exposure

### Category Classification:
- **programming**: Programming/scripting languages (Python, JavaScript, Go, etc.)
- **framework**: Application frameworks (React, Django, Spring Boot, etc.)
- **database**: Database technologies (PostgreSQL, MongoDB, Redis, etc.)
- **cloud**: Cloud platforms & services (AWS, GCP, Azure services)
- **devops**: Infrastructure & DevOps tools (Docker, Kubernetes, Terraform, CI/CD)
- **tool**: Development tools & platforms (Git, Jira, VS Code, etc.)
- **data**: Data & ML tools (Pandas, TensorFlow, Tableau, etc.)
- **soft**: Soft skills (Leadership, Communication, Problem-solving, etc.)
- **certification**: Certifications and credentials
- **other**: Domain knowledge, methodologies, other skills

### Experience Analysis:
- Calculate precise duration for each role
- Extract quantifiable achievements with metrics when available
- Identify key technologies used in each role
- Note leadership and scope indicators

### Output JSON Schema:
{
  "skills": [{
    "name": "string (industry-standard name)",
    "category": "programming|framework|database|cloud|devops|tool|data|soft|certification|other",
    "level": "beginner|intermediate|advanced|expert",
    "yearsUsed": "number (estimated years, optional)"
  }],
  "keywords": ["string array of important ATS keywords from resume"],
  "experience": [{
    "title": "string",
    "company": "string",
    "duration": "string (e.g., 'Jan 2020 - Present' or '2.5 years')",
    "responsibilities": ["string array of key responsibilities/achievements"]
  }],
  "education": [{
    "degree": "string",
    "institution": "string",
    "year": "string",
    "field": "string"
  }],
  "summary": "string (2-3 sentence professional summary highlighting key strengths)",
  "yearsOfExperience": "number (total professional years, calculated from work history)"
}

RESUME TEXT:
${resumeText}

Provide complete, accurate JSON response only.`

  try {
    const response = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      true
    )

    return parseJsonResponse<ResumeAnalysis>(response)
  } catch (error) {
    console.warn("Resume analysis fallback engaged", {
      error: error instanceof Error ? error.message : String(error),
    })
    return createFallbackResumeAnalysis(resumeText)
  }
}

/**
 * Generate embedding vector for text using simple keyword-based approach
 * OpenRouter doesn't provide embeddings, so we use a simplified approach
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Create a simple TF-IDF-like vector for semantic matching
  // This is a fallback since OpenRouter doesn't provide embeddings
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#\s]/g, " ")
    .split(/\W+/)
    .filter((w) => w.length > 2)
  const wordFreq = new Map<string, number>()

  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
  }

  // Create a fixed-size vector using hash-based projection
  const vector: number[] = new Array(768).fill(0)

  const trigramCache = new Map<string, Set<string>>()

  for (const [word, freq] of wordFreq) {
    // Simple hash function to map words to vector positions
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i)
      hash = hash & hash
    }
    const positions = [
      Math.abs(hash) % 768,
      Math.abs(hash * 31) % 768,
      Math.abs(hash * 37) % 768,
    ]
    for (const pos of positions) {
      vector[pos] += freq / words.length
    }

    if (word.length >= 5) {
      let trigrams = trigramCache.get(word)
      if (!trigrams) {
        trigrams = new Set()
        for (let i = 0; i <= word.length - 3; i++) {
          trigrams.add(word.slice(i, i + 3))
        }
        trigramCache.set(word, trigrams)
      }

      for (const trigram of trigrams) {
        let trigramHash = 0
        for (let i = 0; i < trigram.length; i++) {
          trigramHash = (trigramHash << 5) - trigramHash + trigram.charCodeAt(i)
          trigramHash = trigramHash & trigramHash
        }
        const trigramPositions = [
          Math.abs(trigramHash) % 768,
          Math.abs(trigramHash * 19) % 768,
        ]
        for (const pos of trigramPositions) {
          vector[pos] += (freq / words.length) * 0.25
        }
      }
    }
  }

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude
    }
  }

  return vector
}

/**
 * Extract skills and requirements from job description
 */
export async function extractJobRequirements(jobDescription: string): Promise<{
  skills: string[]
  requirements: string[]
  niceToHave: string[]
  experienceLevel: string
}> {
  const systemPrompt = `You are a senior technical recruiter and job market analyst with extensive experience parsing job descriptions across technology, engineering, and business domains.

Your expertise includes:
- Distinguishing between hard requirements vs. nice-to-haves based on language cues ("must have", "required" vs. "preferred", "bonus")
- Understanding industry skill taxonomies and recognizing equivalent skills (e.g., AWS/GCP/Azure are interchangeable cloud skills)
- Detecting hidden requirements implied by tech stack or company context
- Accurate experience level classification based on years mentioned, scope of responsibilities, and title expectations

You MUST respond with valid JSON only, no other text or markdown formatting.`

  const userPrompt = `Analyze this job description with recruiter-level precision and extract structured requirements.

## EXTRACTION GUIDELINES:

### Skills Extraction (CRITICAL):
1. **Required skills**: Skills explicitly marked as "required", "must have", "essential", or listed in requirements section
2. **Preferred skills**: Skills marked as "nice to have", "preferred", "bonus", or in "plus" section
3. **Implied skills**: Core skills implied by the tech stack (e.g., REST APIs implies HTTP, JSON knowledge)
4. **Skill naming**: Use consistent, industry-standard naming (e.g., "React" not "ReactJS" or "react.js")
5. **Prioritize by frequency**: Skills mentioned multiple times are more critical

### Experience Level Detection:
Classify based on:
- **entry**: 0-2 years, "junior", "graduate", "associate", entry-level responsibilities
- **mid**: 2-5 years, "mid-level", independent contributor, feature ownership
- **senior**: 5-8 years, "senior", technical leadership, mentoring, architecture decisions
- **lead**: 8-12 years, "lead", "principal", "staff", team leadership, cross-team influence
- **executive**: 12+ years, "director", "VP", "CTO", strategic/organizational leadership

### Requirements Classification:
- **Hard requirements**: Non-negotiable (degree requirements, security clearances, specific certifications)
- **Soft requirements**: Important but flexible (exact years of experience, specific tool versions)

### Output JSON Schema:
{
  "skills": ["string array of ALL technical and soft skills, prioritized by importance"],
  "requirements": ["string array of must-have requirements and qualifications"],
  "niceToHave": ["string array of preferred/bonus qualifications"],
  "experienceLevel": "entry|mid|senior|lead|executive",
  "yearsRequired": "number (minimum years if specified, 0 if not mentioned)",
  "educationRequired": "string (degree requirement if any, empty string if flexible)"
}

JOB DESCRIPTION:
${jobDescription}

Provide complete, accurate JSON response only.`

  try {
    const response = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      true
    )

    return parseJsonResponse<{
      skills: string[]
      requirements: string[]
      niceToHave: string[]
      experienceLevel: string
      yearsRequired?: number
      educationRequired?: string
    }>(response)
  } catch (error) {
    console.warn("Job requirement extraction fallback engaged", {
      error: error instanceof Error ? error.message : String(error),
    })
    return createFallbackJobRequirements(jobDescription)
  }
}

/**
 * Generate match explanation between resume and job
 */
export async function generateMatchExplanation(
  resumeData: ResumeAnalysis,
  jobRequirements: { skills: string[]; requirements: string[] },
  matchScore: number,
  skillGaps: string[]
): Promise<string> {
  const systemPrompt = `You are a career coach and technical interview specialist who helps candidates understand their fit for roles and develop improvement strategies.

Your communication style:
- Encouraging but realistic - never sugarcoat significant gaps
- Action-oriented - every weakness should have a concrete path forward
- Specific - reference actual skills and experiences from the resume
- Professional - suitable for sharing with hiring managers if needed

You provide personalized, insightful analysis that helps candidates make informed application decisions.`

  const prompt = `Generate a personalized, actionable match explanation for this candidate-job pairing.

## CANDIDATE PROFILE:
- **Technical Skills**: ${resumeData.skills.filter(s => s.category !== 'soft').map((s) => `${s.name} (${s.level || 'proficient'})`).join(", ") || 'Not specified'}
- **Soft Skills**: ${resumeData.skills.filter(s => s.category === 'soft').map((s) => s.name).join(", ") || 'To be assessed'}
- **Total Experience**: ${resumeData.yearsOfExperience} years
- **Summary**: ${resumeData.summary}

## JOB REQUIREMENTS:
- **Required Skills**: ${jobRequirements.skills.join(", ")}
- **Key Requirements**: ${jobRequirements.requirements.join(", ")}

## MATCH ANALYSIS:
- **Overall Match Score**: ${matchScore}%
- **Skills Gap**: ${skillGaps.length > 0 ? skillGaps.join(", ") : "No critical gaps identified"}
- **Match Quality**: ${matchScore >= 80 ? 'Excellent Match' : matchScore >= 60 ? 'Strong Match' : matchScore >= 40 ? 'Moderate Match' : 'Development Opportunity'}

## REQUIRED OUTPUT STRUCTURE:

Write a 3-4 paragraph analysis following this structure:

**Paragraph 1 - Strengths Alignment:**
Highlight 2-3 specific skills/experiences from the candidate that directly align with job requirements. Use concrete examples from their background.

**Paragraph 2 - Gap Analysis:**
Honestly assess any skill gaps. For each gap:
- Rate significance (critical vs. nice-to-have)
- Estimate learning curve (weeks/months)
- Note any transferable skills that could help bridge the gap

**Paragraph 3 - Application Strategy:**
Provide specific recommendations:
- If score >= 70%: Emphasize tailoring resume to highlight matching skills
- If score 50-69%: Suggest addressing gaps in cover letter, mention learning initiatives
- If score < 50%: Recommend skill development path before applying OR suggest similar roles that better match current profile

**Paragraph 4 - Quick Wins (if applicable):**
Identify 1-2 skills that could be quickly acquired (< 1 month) to significantly improve candidacy.

Be specific, use the candidate's actual skills, and provide actionable next steps.`

  try {
    const response = await callOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ])

    return response || "Unable to generate explanation."
  } catch {
    return "Match analysis complete. Review the skill gaps above for areas of improvement."
  }
}

// ============ Resume Tailoring Functions ============

export interface ResumeChange {
  section: string
  original: string
  modified: string
  reason: string
}

export interface TailoredResumeResult {
  optimizedText: string
  changes: ResumeChange[]
  addedKeywords: string[]
  atsScore: number
  summary: string
  prioritizedSkills?: string[]
  experience?: Array<{
    title: string
    company: string
    description: string
  }>
}

function clampAtsScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

function sanitizeTailoredResumeResult(
  result: TailoredResumeResult
): TailoredResumeResult {
  const optimizedText =
    sanitizeTailoredResumeText(result.optimizedText || "") ||
    (result.optimizedText || "").trim()
  const rawChanges = Array.isArray(result.changes) ? result.changes : []
  const rawKeywords = Array.isArray(result.addedKeywords)
    ? result.addedKeywords
    : []

  const changes = sanitizeTailoredResumeChanges(rawChanges)
    .map((change) => ({
      section: change.section || "General",
      original: change.original || "",
      modified: change.modified || "",
      reason: change.reason || "Improved clarity and relevance",
    }))
    .filter((change) => change.modified.length > 0)

  return {
    optimizedText,
    changes,
    addedKeywords: sanitizeTailoredKeywords(rawKeywords),
    atsScore: clampAtsScore(result.atsScore),
    summary:
      sanitizeTailoredInlineText(result.summary || "") ||
      "Optimized resume content while preserving factual accuracy.",
    prioritizedSkills: Array.isArray(result.prioritizedSkills)
      ? sanitizeTailoredKeywords(
          result.prioritizedSkills.filter(
            (skill): skill is string => typeof skill === "string"
          )
        )
      : [],
    experience: Array.isArray(result.experience)
      ? result.experience
          .filter(
            (item): item is { title: string; company: string; description: string } =>
              !!item && typeof item === "object"
          )
          .map((item) => ({
            title: sanitizeTailoredInlineText(item.title || "") || "Role",
            company: sanitizeTailoredInlineText(item.company || "") || "Company",
            description:
              sanitizeTailoredResumeText(item.description || "") ||
              "Tailored experience details",
          }))
      : [],
  }
}

/**
 * Tailor resume for a specific job while maintaining factual accuracy
 */
export async function tailorResume(
  originalResumeText: string,
  resumeAnalysis: ResumeAnalysis,
  jobTitle: string,
  jobDescription: string,
  requiredSkills: string[]
): Promise<TailoredResumeResult> {
  const systemPrompt = `You are an expert resume optimizer. You MUST respond with valid JSON only.`

  const userPrompt = `Tailor this resume for the specific job while maintaining COMPLETE FACTUAL ACCURACY.

CRITICAL RULES:
1. NEVER fabricate experience, skills, or achievements
2. NEVER add skills the candidate doesn't have
3. ONLY reorganize, rephrase, and emphasize EXISTING content
4. Optimize keyword placement for ATS systems
5. Preserve the original resume structure and section order whenever possible
6. Keep the name/contact header intact unless fixing obvious formatting issues
7. Put each section heading on its own line; never merge heading and body in one line

ORIGINAL RESUME:
${originalResumeText}

CANDIDATE'S VERIFIED SKILLS:
${resumeAnalysis.skills.map((s) => s.name).join(", ")}

TARGET JOB:
Title: ${jobTitle}

Description:
${jobDescription}

Required Skills:
${requiredSkills.join(", ")}

Respond with a JSON object containing:
- optimizedText: the complete optimized resume in clean Markdown format, using this exact structure when data exists:
  - optional first line: candidate name
  - optional second line: contact line (email | phone | linkedin | github)
  - section headings as "## Professional Summary", "## Technical Skills", "## Experience", "## Projects", "## Education", "## Leadership & Activities"
  - bullet points must start with "-"
  - no prose outside the resume, no placeholders, no wrapper titles like "Tailored Resume", no signatures, no encoded tokens
- changes: array of {section, original, modified, reason}
- addedKeywords: array of keywords emphasized
- atsScore: estimated ATS score 0-100
- summary: summary of optimizations made
- prioritizedSkills: ordered list of the most relevant existing skills to highlight for this role
- experience: array of {title, company, description} for the 2-4 most relevant experience entries rewritten with the tailored emphasis

Respond with valid JSON only.`

  try {
    const response = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      true,
      3,
      0.2
    )

    return sanitizeTailoredResumeResult(
      parseJsonResponse<TailoredResumeResult>(response)
    )
  } catch (error) {
    console.warn("Resume tailoring fallback engaged", {
      error: error instanceof Error ? error.message : String(error),
    })
    return sanitizeTailoredResumeResult(
      createFallbackTailoredResumeResult(
        originalResumeText,
        resumeAnalysis,
        jobTitle,
        requiredSkills
      )
    )
  }
}

/**
 * Analyze ATS compatibility of a resume
 */
export async function analyzeATSCompatibility(resumeText: string): Promise<{
  score: number
  issues: string[]
  suggestions: string[]
}> {
  const systemPrompt = `You are an ATS (Applicant Tracking System) expert. You MUST respond with valid JSON only.`

  const userPrompt = `Analyze this resume for ATS compatibility.

RESUME:
${resumeText}

Check for:
1. Standard section headers
2. Simple formatting
3. Keyword density
4. Date format consistency
5. Contact information

Respond with a JSON object containing:
- score: ATS compatibility score 0-100
- issues: array of potential issues found
- suggestions: array of improvement suggestions

Respond with valid JSON only.`

  try {
    const response = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      true
    )

    return parseJsonResponse<{
      score: number
      issues: string[]
      suggestions: string[]
    }>(response)
  } catch {
    return {
      score: 70,
      issues: ["Unable to perform detailed analysis"],
      suggestions: ["Ensure standard section headers and simple formatting"],
    }
  }
}

/**
 * Generate improvement suggestions for resume
 */
export async function generateImprovementSuggestions(
  resumeAnalysis: ResumeAnalysis,
  targetRole?: string
): Promise<string[]> {
  const prompt = `Based on this resume analysis, provide 5-7 specific, actionable improvement suggestions.

CANDIDATE PROFILE:
- Skills: ${resumeAnalysis.skills
      .map((s) => `${s.name} (${s.level || "unknown level"})`)
      .join(", ")}
- Experience: ${resumeAnalysis.yearsOfExperience} years
- Summary: ${resumeAnalysis.summary}

${targetRole ? `TARGET ROLE: ${targetRole}` : ""}

Provide specific, actionable suggestions. Format as a numbered list.`

  try {
    const response = await callOpenRouter([{ role: "user", content: prompt }])

    const suggestions = response
      .split(/\d+\.\s+/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim().replace(/\n/g, " "))

    return suggestions.slice(0, 7)
  } catch {
    return [
      "Consider adding more quantifiable achievements to your experience section.",
    ]
  }
}
