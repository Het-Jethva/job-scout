const MARKDOWN_CODE_FENCE_PATTERN = /^\s*```(?:\w+)?\s*$/
const WRAPPER_LINE_PATTERNS = [
  /^\s*#{0,6}\s*tailored\s+resume\s*:?\s*$/i,
  /^\s*#{0,6}\s*tailored\s+for\b.*$/i,
  /^\s*#{0,6}\s*resume\s+tailored\b.*$/i,
  /^\s*content unavailable for this section\.?\s*$/i,
]
const WATERMARK_LINE_PATTERNS = [
  /^\s*ELOQUENTLY\s*$/i,
  /^\s*ELOQUENTLY\s*#?[A-Za-z0-9+/=]{8,}\s*$/i,
  /^\s*[A-Z][A-Z0-9 _-]{4,}\s+#?[A-Za-z0-9+/=]{10,}\s*$/,
]
const WATERMARK_SUFFIX_PATTERN =
  /\s+[A-Z][A-Z0-9 _-]{4,}\s+#?[A-Za-z0-9+/=]{10,}\s*$/
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g

function isNoiseLine(value: string): boolean {
  return (
    WRAPPER_LINE_PATTERNS.some((pattern) => pattern.test(value)) ||
    WATERMARK_LINE_PATTERNS.some((pattern) => pattern.test(value))
  )
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(ZERO_WIDTH_PATTERN, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
}

export function sanitizeTailoredInlineText(value: string): string {
  const normalized = normalizeWhitespace(value || "")
    .replace(WATERMARK_SUFFIX_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!normalized || isNoiseLine(normalized) || MARKDOWN_CODE_FENCE_PATTERN.test(normalized)) {
    return ""
  }

  return normalized
}

export function sanitizeTailoredResumeText(value: string): string {
  const normalized = normalizeWhitespace(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")

  const lines = normalized.split("\n")
  const kept: string[] = []

  for (const line of lines) {
    const sanitized = line.replace(WATERMARK_SUFFIX_PATTERN, "").trimEnd()
    const trimmed = sanitized.trim()

    if (MARKDOWN_CODE_FENCE_PATTERN.test(trimmed)) {
      continue
    }

    if (!trimmed) {
      if (kept.length > 0 && kept[kept.length - 1] !== "") {
        kept.push("")
      }
      continue
    }

    if (isNoiseLine(trimmed)) {
      continue
    }

    kept.push(sanitized)
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

export interface TailoredResumeChangeLike {
  section?: string
  original?: string
  modified?: string
  reason?: string
}

export function sanitizeTailoredResumeChanges(
  changes: TailoredResumeChangeLike[]
): TailoredResumeChangeLike[] {
  const sanitized: TailoredResumeChangeLike[] = []

  for (const change of changes) {
    const section = sanitizeTailoredInlineText(change.section || "")
    const original = sanitizeTailoredResumeText(change.original || "")
    const modified = sanitizeTailoredResumeText(change.modified || "")
    const reason = sanitizeTailoredResumeText(change.reason || "")

    if (!modified) {
      continue
    }

    sanitized.push({
      section: section || "General",
      original,
      modified,
      reason: reason || "Improved clarity and relevance",
    })
  }

  return sanitized
}

export function sanitizeTailoredKeywords(keywords: string[]): string[] {
  const deduped = new Map<string, string>()

  for (const keyword of keywords) {
    const cleaned = sanitizeTailoredInlineText(keyword)
    if (!cleaned) {
      continue
    }

    const dedupeKey = cleaned.toLowerCase()
    if (deduped.has(dedupeKey)) {
      continue
    }

    deduped.set(dedupeKey, cleaned)
  }

  return [...deduped.values()]
}
