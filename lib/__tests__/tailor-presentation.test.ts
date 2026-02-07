import { describe, expect, it } from "vitest"
import { mapTailoredResumeToContent } from "@/lib/domains/tailor/presentation"

describe("tailored resume presentation mapping", () => {
  it("maps keyword and change data with modified field", () => {
    const content = mapTailoredResumeToContent({
      optimizedText: "Optimized summary",
      changes: [
        {
          section: "Summary",
          original: "Old summary",
          modified: "New summary",
          reason: "Aligned with JD",
        },
      ],
      keywords: ["react", "typescript"],
      atsScore: 86,
    })

    expect(content.summary).toBe("Optimized summary")
    expect(content.skills).toEqual(["react", "typescript"])
    expect(content.changes[0]).toEqual({
      section: "Summary",
      original: "Old summary",
      tailored: "New summary",
      reason: "Aligned with JD",
    })
    expect(content.atsScore).toBe(86)
  })

  it("supports legacy tailored change field and JSON-string changes", () => {
    const content = mapTailoredResumeToContent({
      optimizedText: "Optimized summary",
      changes: JSON.stringify([
        {
          section: "Experience",
          original: "Built things",
          tailored: "Built and shipped production features",
          reason: "Stronger action verbs",
        },
      ]),
      keywords: ["nodejs"],
      atsScore: null,
    })

    expect(content.changes).toHaveLength(1)
    expect(content.changes[0].tailored).toBe(
      "Built and shipped production features"
    )
    expect(content.atsScore).toBeUndefined()
  })

  it("drops malformed change objects", () => {
    const content = mapTailoredResumeToContent({
      optimizedText: "Optimized summary",
      changes: [{ section: "Summary", original: "Old" }],
      keywords: ["react"],
      atsScore: 72,
    })

    expect(content.changes).toEqual([])
  })

  it("removes non-resume wrapper and watermark noise", () => {
    const content = mapTailoredResumeToContent({
      optimizedText: `Tailored Resume
Tailored for Full Stack Developer at Example Org
PROFESSIONAL SUMMARY
Built and shipped production web applications.
ELOQUENTLY #RODguMTk4Ljk5LjE0Mw==`,
      changes: [],
      keywords: ["React", "ELOQUENTLY #RODguMTk4Ljk5LjE0Mw==", "react"],
      atsScore: 80,
    })

    expect(content.summary).toBe(
      "PROFESSIONAL SUMMARY\nBuilt and shipped production web applications."
    )
    expect(content.keywords).toEqual(["React"])
  })
})
