import { z } from "zod"
import { safeParseJson } from "@/lib/serialization"

export interface MatchSkillBreakdown {
  matched: string[]
  partial: string[]
  missing: string[]
}

const storedBreakdownSchema = z.object({
  matched: z.array(z.string()).default([]),
  partial: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
})

const legacyBreakdownSchema = z.object({
  matchedSkills: z.array(z.string()).default([]),
  partialMatches: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
})

export function parseMatchSkillBreakdown(value: unknown): MatchSkillBreakdown {
  const parsedValue =
    typeof value === "string" ? safeParseJson<unknown>(value, null) : value

  const storedBreakdown = storedBreakdownSchema.safeParse(parsedValue)
  if (storedBreakdown.success) {
    return storedBreakdown.data
  }

  const legacyBreakdown = legacyBreakdownSchema.safeParse(parsedValue)
  if (legacyBreakdown.success) {
    return {
      matched: legacyBreakdown.data.matchedSkills,
      partial: legacyBreakdown.data.partialMatches,
      missing: legacyBreakdown.data.missingSkills,
    }
  }

  return {
    matched: [],
    partial: [],
    missing: [],
  }
}
