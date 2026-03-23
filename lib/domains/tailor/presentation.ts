import {
  sanitizeTailoredInlineText,
  sanitizeTailoredKeywords,
  sanitizeTailoredResumeText,
} from "@/lib/services/tailored-resume-sanitizer"
import { safeParseJson } from "@/lib/serialization"

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
    const parsed = safeParseJson<unknown>(value, [])
    return Array.isArray(parsed) ? parsed : []
  }

  return []
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
  changes: unknown
  keywords: unknown
  atsScore: number | null
}): TailoredContentView {
  const cleanedSummary = sanitizeTailoredResumeText(input.optimizedText)
  const keywords = normalizeKeywords(input.keywords)
  const changes = parseChanges(input.changes)
    .map(mapTailoredChange)
    .filter((change): change is TailoredChangeView => change !== null)

  return {
    summary: cleanedSummary || toStringValue(input.optimizedText).trim(),
    skills: keywords,
    experience: [],
    changes,
    atsScore: input.atsScore ?? undefined,
    keywords,
  }
}
