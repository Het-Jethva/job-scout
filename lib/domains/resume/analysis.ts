import { z } from "zod"
import {
  type ResumeAnalysis,
  type ExtractedSkill,
  type ExtractedExperience,
  type ExtractedEducation,
} from "@/lib/services/openrouter"

const extractedSkillSchema: z.ZodType<ExtractedSkill> = z.object({
  name: z.string(),
  category: z.string(),
  level: z.string().optional(),
})

const extractedExperienceSchema: z.ZodType<ExtractedExperience> = z.object({
  title: z.string(),
  company: z.string(),
  duration: z.string(),
  responsibilities: z.array(z.string()).default([]),
})

const extractedEducationSchema: z.ZodType<ExtractedEducation> = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string(),
  field: z.string(),
})

const resumeAnalysisSchema: z.ZodType<ResumeAnalysis> = z.object({
  skills: z.array(extractedSkillSchema).default([]),
  keywords: z.array(z.string()).default([]),
  experience: z.array(extractedExperienceSchema).default([]),
  education: z.array(extractedEducationSchema).default([]),
  summary: z.string().default(""),
  yearsOfExperience: z.coerce.number().default(0),
})

function parseStoredJson(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  if (value && typeof value === "object") {
    return value
  }

  return null
}

export function parseStoredResumeAnalysis(value: unknown): ResumeAnalysis | null {
  const parsed = parseStoredJson(value)
  if (!parsed) {
    return null
  }

  const knownFields: Array<keyof ResumeAnalysis> = [
    "skills",
    "keywords",
    "experience",
    "education",
    "summary",
    "yearsOfExperience",
  ]
  const hasKnownField =
    typeof parsed === "object" &&
    parsed !== null &&
    knownFields.some((field) =>
      Object.prototype.hasOwnProperty.call(parsed, field)
    )

  if (!hasKnownField) {
    return null
  }

  const result = resumeAnalysisSchema.safeParse(parsed)
  return result.success ? result.data : null
}

export async function resolveResumeAnalysis(
  rawResumeText: string,
  storedParsedData: unknown
): Promise<ResumeAnalysis> {
  const cachedAnalysis = parseStoredResumeAnalysis(storedParsedData)
  if (cachedAnalysis) {
    return cachedAnalysis
  }

  const { extractResumeData } = await import("@/lib/services/openrouter")
  return extractResumeData(rawResumeText)
}
