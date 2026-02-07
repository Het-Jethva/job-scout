import { describe, expect, it } from "vitest"
import {
  sanitizeTailoredKeywords,
  sanitizeTailoredResumeChanges,
  sanitizeTailoredResumeText,
} from "@/lib/services/tailored-resume-sanitizer"

describe("tailored resume sanitizer", () => {
  it("strips wrapper lines and watermark noise", () => {
    const cleaned = sanitizeTailoredResumeText(`Tailored Resume
Tailored for Backend Engineer at Example Inc
SUMMARY
Built resilient APIs and deployment pipelines.
ELOQUENTLY #RODguMTk4Ljk5LjE0Mw==`)

    expect(cleaned).toBe(
      "SUMMARY\nBuilt resilient APIs and deployment pipelines."
    )
  })

  it("sanitizes and filters changes", () => {
    const changes = sanitizeTailoredResumeChanges([
      {
        section: "Tailored Resume",
        original: "Old",
        modified: "Improved API ownership phrasing",
        reason: "ELOQUENTLY #RODguMTk4Ljk5LjE0Mw==",
      },
      {
        section: "Summary",
        original: "Old",
        modified: "",
        reason: "No change",
      },
    ])

    expect(changes).toEqual([
      {
        section: "General",
        original: "Old",
        modified: "Improved API ownership phrasing",
        reason: "Improved clarity and relevance",
      },
    ])
  })

  it("dedupes keywords case-insensitively and removes noise", () => {
    const keywords = sanitizeTailoredKeywords([
      "React",
      "react",
      "ELOQUENTLY #RODguMTk4Ljk5LjE0Mw==",
      "TypeScript",
    ])

    expect(keywords).toEqual(["React", "TypeScript"])
  })

  it("removes bare watermark headings and placeholder content", () => {
    const cleaned = sanitizeTailoredResumeText(`## Experience
- Shipped features for enterprise customers.

ELOQUENTLY
Content unavailable for this section.

## Skills
- React`)

    expect(cleaned).toBe(
      "## Experience\n- Shipped features for enterprise customers.\n\n## Skills\n- React"
    )
  })
})
