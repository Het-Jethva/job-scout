import { describe, expect, it } from "vitest"
import {
  parseStoredResumeAnalysis,
  resolveResumeAnalysis,
} from "@/lib/domains/resume/analysis"

const validResumeAnalysis = {
  skills: [{ name: "TypeScript", category: "programming", level: "advanced" }],
  keywords: ["typescript", "react"],
  experience: [
    {
      title: "Software Engineer",
      company: "Acme",
      duration: "2022 - Present",
      responsibilities: ["Built frontend features"],
    },
  ],
  education: [
    {
      degree: "BSc",
      institution: "Example University",
      year: "2022",
      field: "Computer Science",
    },
  ],
  summary: "Experienced frontend engineer.",
  yearsOfExperience: 4,
}

describe("resume analysis parsing", () => {
  it("parses stored object data", () => {
    const parsed = parseStoredResumeAnalysis(validResumeAnalysis)
    expect(parsed).toMatchObject(validResumeAnalysis)
  })

  it("parses stored JSON string data", () => {
    const parsed = parseStoredResumeAnalysis(JSON.stringify(validResumeAnalysis))
    expect(parsed).toMatchObject(validResumeAnalysis)
  })

  it("returns null for invalid data", () => {
    const parsed = parseStoredResumeAnalysis({ invalid: true })
    expect(parsed).toBeNull()
  })

  it("returns cached analysis without invoking AI extraction", async () => {
    const resolved = await resolveResumeAnalysis(
      "raw resume text",
      validResumeAnalysis
    )

    expect(resolved).toMatchObject(validResumeAnalysis)
  })
})
