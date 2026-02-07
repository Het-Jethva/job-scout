import { describe, expect, it } from "vitest"
import {
  buildTailoredResumeLatexSource,
  renderTailoredResumePdf,
} from "@/lib/services/latex-resume"

describe("renderTailoredResumePdf", () => {
  it("returns a PDF buffer with expected header", async () => {
    const pdf = await renderTailoredResumePdf({
      jobTitle: "Senior Frontend Engineer",
      companyName: "Acme",
      summary: "# Alex Doe\n- Built high-scale React applications.",
      keywords: ["react", "typescript", "next.js"],
      changes: [
        {
          section: "Summary",
          tailored: "Emphasized frontend architecture leadership.",
          reason: "Aligned with role scope.",
        },
      ],
    })

    expect(Buffer.isBuffer(pdf)).toBe(true)
    expect(pdf.length).toBeGreaterThan(100)
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF")
  })

  it("builds latex source with escaped characters and sections", () => {
    const source = buildTailoredResumeLatexSource({
      jobTitle: "Staff Engineer",
      companyName: "ACME & Co",
      summary:
        "# Alex Doe\nalex@example.com | linkedin.com/in/alex\n\n## Experience\n- Scaled APIs by 40%\n- Built tooling in C# and TypeScript",
      keywords: ["TypeScript", "React"],
      changes: [],
    })

    expect(source).toContain("\\section*{Experience}")
    expect(source).toContain("\\item Scaled APIs by 40\\%")
    expect(source).not.toContain("Tailored for Staff Engineer at ACME \\& Co")
    expect(source).not.toContain("Tailored Resume")
  })

  it("falls back to generated content when summary is empty", async () => {
    const pdf = await renderTailoredResumePdf({
      jobTitle: "Platform Engineer",
      companyName: "Acme",
      summary: "",
      keywords: ["Go", "Kubernetes"],
      changes: [
        {
          section: "Experience",
          tailored: "Improved deployment throughput by 20%.",
          reason: "Aligned with platform ownership requirements.",
        },
      ],
    })

    expect(pdf.length).toBeGreaterThan(100)
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF")
  })

  it("parses inline section headings without placeholder leakage", () => {
    const source = buildTailoredResumeLatexSource({
      jobTitle: "Software Engineer",
      companyName: "Acme",
      summary: `Het Jethva Ahmedabad
Het Jethva Ahmedabad, Gujarat - +91 6353125912 - hetjethva07@gmail.com - linkedin.com/in/hetjethva
EDUCATION Adani University - B.Tech, Computer Science & Engineering (AI-ML)
TECHNICAL SKILLS
- JavaScript
Leadership & Activities Web Development Lead, ASPDC
ELOQUENTLY
Content unavailable for this section.`,
      keywords: [],
      changes: [],
    })

    expect(source).toContain("\\section*{Education}")
    expect(source).toContain("\\section*{Technical Skills}")
    expect(source).toContain("\\section*{Leadership \\& Activities}")
    expect(source).not.toContain("Content unavailable for this section.")
    expect(source).not.toContain("ELOQUENTLY")
  })

  it("uses source resume text when tailored summary is empty", () => {
    const source = buildTailoredResumeLatexSource({
      jobTitle: "Platform Engineer",
      companyName: "Acme",
      summary: "",
      sourceResumeText: `Alex Doe
alex@example.com | github.com/alex
## Experience
- Shipped internal developer platform`,
      keywords: [],
      changes: [],
    })

    expect(source).toContain("\\textbf{Alex Doe}")
    expect(source).toContain("\\section*{Experience}")
    expect(source).toContain("\\item Shipped internal developer platform")
  })
})
