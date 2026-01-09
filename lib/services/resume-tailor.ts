import type { ResumeAnalysis } from "./openrouter"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "openai/gpt-oss-120b"

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set")
  }
  return key
}

async function callOpenRouter(prompt: string): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "",
      "X-Title": "Job Scout",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.")
    }
    if (response.status === 401) {
      throw new Error("Invalid API key")
    }
    throw new Error(`OpenRouter API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

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
  const prompt = `You are an expert resume optimizer. Your task is to tailor this resume for the specific job while maintaining COMPLETE FACTUAL ACCURACY.

CRITICAL RULES:
1. NEVER fabricate experience, skills, or achievements
2. NEVER add skills the candidate doesn't have
3. NEVER exaggerate or inflate numbers/metrics
4. ONLY reorganize, rephrase, and emphasize EXISTING content
5. Optimize keyword placement for ATS systems
6. Improve action verbs and professional language
7. Highlight relevant experience by repositioning content

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

OPTIMIZATION GUIDELINES:
1. Move relevant experience and skills higher in sections
2. Use keywords from the job description where they genuinely apply
3. Strengthen action verbs (e.g., "helped" → "contributed to", "did" → "executed")
4. Add quantifiable metrics ONLY if they exist in the original
5. Ensure consistent formatting
6. Keep the same structure but optimize content order
7. Match terminology to industry standards

Provide the optimized resume and track ALL changes made with explanations.

Respond with a valid JSON object containing:
- optimizedText: string
- changes: array of {section, original, modified, reason}
- addedKeywords: array of strings
- atsScore: number (0-100)
- summary: string`

  try {
    const response = await callOpenRouter(prompt)
    const cleaned = response
      .trim()
      .replace(/^```json\n?|^```\n?|\n?```$/g, "")
      .trim()
    return JSON.parse(cleaned) as TailoredResumeResult
  } catch (error) {
    const message = (error as Error)?.message || "Failed to tailor resume"

    if (message.includes("Rate limit")) {
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
  const prompt = `Analyze this resume for ATS (Applicant Tracking System) compatibility.

RESUME:
${resumeText}

Check for:
1. Standard section headers (Experience, Education, Skills)
2. Simple formatting (avoid tables, graphics, columns)
3. Standard fonts and bullet points
4. Contact information placement
5. Keyword density and placement
6. Date formats consistency
7. File structure clarity
8. Potential parsing issues

Provide a score and actionable feedback.

Respond with a valid JSON object containing:
- score: number (0-100)
- issues: array of strings
- suggestions: array of strings`

  try {
    const response = await callOpenRouter(prompt)
    const cleaned = response
      .trim()
      .replace(/^```json\n?|^```\n?|\n?```$/g, "")
      .trim()
    return JSON.parse(cleaned)
  } catch (_error) {
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

Provide specific, actionable suggestions to improve this resume's effectiveness.
Focus on:
1. Skills gaps to address
2. Experience presentation improvements
3. Missing elements (projects, certifications, metrics)
4. Industry-specific recommendations

Provide 5-7 numbered suggestions.`

  try {
    const response = await callOpenRouter(prompt)
    // Parse numbered list from response
    const suggestions = response
      .split(/\d+\.\s+/)
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim().replace(/\n/g, " "))

    return suggestions.slice(0, 7)
  } catch (_error) {
    return [
      "Consider adding more quantifiable achievements to your experience section.",
    ]
  }
}
