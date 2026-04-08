import {
  sanitizeTailoredInlineText,
  sanitizeTailoredKeywords,
  sanitizeTailoredResumeText,
} from "@/lib/services/tailored-resume-sanitizer"

interface RawTailoredChange {
  section?: unknown
  original?: unknown
  modified?: unknown
  tailored?: unknown
  reason?: unknown
}

export interface TailoredChangeView {
  section: string
  original: string
  tailored: string
  reason: string
}

export interface TailoredStructuredContent {
  summary: string
  skills: string[]
  experience: Array<{ title: string; company: string; description: string }>
}

export interface TailoredContentView {
  summary: string
  skills: string[]
  experience: Array<{ title: string; company: string; description: string }>
  changes: TailoredChangeView[]
  atsScore?: number
  keywords: string[]
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return sanitizeTailoredKeywords(
    value
    .filter((keyword): keyword is string => typeof keyword === "string")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0)
  )
}

function parseChanges(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function parseStructuredContent(value: unknown): TailoredStructuredContent | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const candidate = value as Record<string, unknown>
  const skills = Array.isArray(candidate.skills)
    ? sanitizeTailoredKeywords(
        candidate.skills.filter((skill): skill is string => typeof skill === "string")
      )
    : []

  const experience = Array.isArray(candidate.experience)
    ? candidate.experience
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          title: sanitizeTailoredInlineText(toStringValue(item.title)) || "Role",
          company: sanitizeTailoredInlineText(toStringValue(item.company)) || "Company",
          description:
            sanitizeTailoredResumeText(toStringValue(item.description)) ||
            "Tailored experience details",
        }))
    : []

  const summary = sanitizeTailoredResumeText(toStringValue(candidate.summary))

  if (!summary && skills.length === 0 && experience.length === 0) {
    return null
  }

  return {
    summary,
    skills,
    experience,
  }
}

function mapTailoredChange(rawChange: unknown): TailoredChangeView | null {
  if (!rawChange || typeof rawChange !== "object") {
    return null
  }

  const change = rawChange as RawTailoredChange
  const tailoredText = sanitizeTailoredResumeText(
    toStringValue(change.modified) || toStringValue(change.tailored)
  )
  if (!tailoredText) {
    return null
  }

  return {
    section: sanitizeTailoredInlineText(toStringValue(change.section)) || "General",
    original: sanitizeTailoredResumeText(toStringValue(change.original)),
    tailored: tailoredText,
    reason:
      sanitizeTailoredResumeText(toStringValue(change.reason)) ||
      "Improved clarity and relevance",
  }
}

export function mapTailoredResumeToContent(input: {
  optimizedText: string
  structuredContent?: unknown
  changes: unknown
  keywords: unknown
  atsScore: number | null
}): TailoredContentView {
  const structuredContent = parseStructuredContent(input.structuredContent)
  const cleanedSummary = sanitizeTailoredResumeText(input.optimizedText)
  const keywords = normalizeKeywords(input.keywords)
  const changes = parseChanges(input.changes)
    .map(mapTailoredChange)
    .filter((change): change is TailoredChangeView => change !== null)

  return {
    summary:
      structuredContent?.summary ||
      cleanedSummary ||
      toStringValue(input.optimizedText).trim(),
    skills: structuredContent?.skills.length
      ? structuredContent.skills
      : keywords,
    experience: structuredContent?.experience ?? [],
    changes,
    atsScore: input.atsScore ?? undefined,
    keywords,
  }
}
