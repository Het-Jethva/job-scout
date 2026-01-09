/**
 * OpenRouter AI Service
 * Uses OpenRouter API with free models for AI features
 */

import { env } from "../env"

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

/**
 * Call OpenRouter API for chat completions
 */
async function callOpenRouter(
  messages: OpenRouterMessage[],
  jsonMode: boolean = false
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
      "X-Title": "Job Scout",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      ...(jsonMode && { response_format: { type: "json_object" } }),
    }),
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.")
    }
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your OPENROUTER_API_KEY.")
    }
    throw new Error(`OpenRouter API error: ${response.status}`)
  }

  const data = (await response.json()) as OpenRouterResponse
  return data.choices[0]?.message?.content || ""
}

/**
 * Parse JSON from response, handling markdown code blocks
 */
function parseJsonResponse<T>(text: string): T {
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

  return JSON.parse(cleaned) as T
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

// ============ AI Functions ============

/**
 * Extract skills and structured data from resume text
 */
export async function extractResumeData(
  resumeText: string
): Promise<ResumeAnalysis> {
  const systemPrompt = `You are an expert resume analyzer. You MUST respond with valid JSON only, no other text.`

  const userPrompt = `Analyze the following resume and extract structured information. Respond with a JSON object containing:
- skills: array of {name, category, level} where category is one of: technical, soft, language, tool, framework, database, cloud, other. level is: beginner, intermediate, advanced, expert
- keywords: array of important keywords from the resume
- experience: array of {title, company, duration, responsibilities} 
- education: array of {degree, institution, year, field}
- summary: brief professional summary
- yearsOfExperience: number of total years

RESUME TEXT:
${resumeText}

Respond with valid JSON only.`

  try {
    const response = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      true
    )

    return parseJsonResponse<ResumeAnalysis>(response)
  } catch {
    throw new Error("Failed to analyze resume with AI")
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
    .split(/\W+/)
    .filter((w) => w.length > 2)
  const wordFreq = new Map<string, number>()

  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
  }

  // Create a fixed-size vector using hash-based projection
  const vector: number[] = new Array(768).fill(0)

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
  const systemPrompt = `You are an expert job description analyzer. You MUST respond with valid JSON only.`

  const userPrompt = `Analyze this job description and extract structured requirements. Respond with a JSON object containing:
- skills: array of required technical and soft skills
- requirements: array of must-have requirements
- niceToHave: array of nice-to-have qualifications
- experienceLevel: one of entry, mid, senior, lead, executive

JOB DESCRIPTION:
${jobDescription}

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
      skills: string[]
      requirements: string[]
      niceToHave: string[]
      experienceLevel: string
    }>(response)
  } catch {
    throw new Error("Failed to analyze job description")
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
  const prompt = `Generate a clear, helpful explanation of how well this candidate matches the job.

CANDIDATE PROFILE:
- Skills: ${resumeData.skills.map((s) => s.name).join(", ")}
- Years of Experience: ${resumeData.yearsOfExperience}
- Summary: ${resumeData.summary}

JOB REQUIREMENTS:
- Required Skills: ${jobRequirements.skills.join(", ")}
- Requirements: ${jobRequirements.requirements.join(", ")}

MATCH ANALYSIS:
- Match Score: ${matchScore}%
- Skills Gap: ${skillGaps.length > 0 ? skillGaps.join(", ") : "None"}

Write a 2-3 paragraph explanation that:
1. Highlights the candidate's strengths for this role
2. Explains any gaps and their significance
3. Provides actionable advice for the candidate

Be encouraging but honest. Focus on facts from the resume.`

  try {
    const response = await callOpenRouter([{ role: "user", content: prompt }])

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
- optimizedText: the complete optimized resume text
- changes: array of {section, original, modified, reason}
- addedKeywords: array of keywords emphasized
- atsScore: estimated ATS score 0-100
- summary: summary of optimizations made

Respond with valid JSON only.`

  try {
    const response = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      true
    )

    return parseJsonResponse<TailoredResumeResult>(response)
  } catch (error) {
    const message = (error as Error)?.message || "Failed to tailor resume"

    if (message.includes("Rate limit") || message.includes("429")) {
      throw new Error(
        "Tailoring temporarily unavailable: Rate limit exceeded. Please try again later."
      )
    }

    throw new Error("Failed to tailor resume")
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
