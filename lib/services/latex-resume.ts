import PDFDocument from "pdfkit"
import { PassThrough } from "stream"
import { sanitizeTailoredResumeText } from "@/lib/services/tailored-resume-sanitizer"

interface TailoredResumeChange {
  section: string
  tailored: string
  reason: string
}

export interface TailoredResumePdfInput {
  jobTitle: string
  companyName: string
  summary: string
  sourceResumeText?: string
  keywords: string[]
  changes: TailoredResumeChange[]
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "spacer" }

type ResumeBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }

interface ResumeSection {
  title: string
  blocks: ResumeBlock[]
}

interface ResumeLayout {
  name: string
  contactLine: string
  sections: ResumeSection[]
}

type PdfDocumentInstance = InstanceType<typeof PDFDocument>

const DASH_PATTERN = /[\u2010-\u2015\u2212]/g
const SINGLE_QUOTE_PATTERN = /[\u2018\u2019\u201A\u201B]/g
const DOUBLE_QUOTE_PATTERN = /[\u201C\u201D\u201E\u201F]/g
const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g
const BULLET_PATTERN = /\u2022/g

const SECTION_TITLE_MAP: Record<string, string> = {
  summary: "Professional Summary",
  professionalsummary: "Professional Summary",
  profile: "Professional Summary",
  experience: "Experience",
  workexperience: "Experience",
  employmenthistory: "Experience",
  skills: "Skills",
  technicalskills: "Technical Skills",
  projects: "Projects",
  projectexperience: "Projects",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
  contact: "Contact",
  publications: "Publications",
  volunteerexperience: "Volunteer Experience",
}

const SECTION_TITLE_HINT_PATTERN =
  /\b(summary|experience|education|skills|projects|activities|competencies|certifications|publications|contact)\b/i
const INLINE_SECTION_TITLES = Array.from(
  new Set([
    ...Object.values(SECTION_TITLE_MAP),
    "Professional Experience",
    "Leadership & Activities",
    "Core Competencies",
    "Contact Information",
  ])
).sort((a, b) => b.length - a.length)

function normalizeMarkdown(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\u00a0/g, " ")
    .replace(ZERO_WIDTH_PATTERN, "")
    .replace(BULLET_PATTERN, "-")
    .replace(DASH_PATTERN, "-")
    .replace(SINGLE_QUOTE_PATTERN, "'")
    .replace(DOUBLE_QUOTE_PATTERN, "\"")
    .replace(/\t/g, " ")
}

function stripMarkdownInline(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeTextForPdf(value: string): string {
  return normalizeMarkdown(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeSectionKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isLikelySectionTitle(value: string): boolean {
  const key = normalizeSectionKey(value)
  if (SECTION_TITLE_MAP[key]) {
    return true
  }

  return (
    /^[A-Z0-9 &/+\-]{3,40}$/.test(value.trim()) &&
    value.trim().split(/\s+/).length <= 4
  )
}

function collapseSpacers(blocks: MarkdownBlock[]): MarkdownBlock[] {
  const collapsed: MarkdownBlock[] = []

  for (const block of blocks) {
    if (block.type === "spacer") {
      if (collapsed.length === 0) {
        continue
      }
      const previous = collapsed[collapsed.length - 1]
      if (previous.type === "spacer") {
        continue
      }
    }
    collapsed.push(block)
  }

  while (collapsed.length > 0 && collapsed[collapsed.length - 1].type === "spacer") {
    collapsed.pop()
  }

  return collapsed
}

function splitInlineSectionHeading(
  value: string
): { title: string; remainder: string } | null {
  const line = normalizeTextForPdf(stripMarkdownInline(value || ""))
  if (!line) {
    return null
  }

  for (const title of INLINE_SECTION_TITLES) {
    const escapedTitle = escapeRegex(normalizeTextForPdf(title))
    if (!escapedTitle) {
      continue
    }

    const pattern = new RegExp(
      `^${escapedTitle}(?:\\s*[:|\\-]\\s*|\\s+)(.+)$`,
      "i"
    )
    const match = pattern.exec(line)
    if (!match) {
      continue
    }

    const remainder = normalizeTextForPdf(match[1])
    if (!remainder) {
      continue
    }

    return {
      title,
      remainder,
    }
  }

  const genericMatch = /^([A-Z][A-Z0-9 &/+\-]{2,40})\s+(.+)$/.exec(line)
  if (!genericMatch) {
    return null
  }

  const heading = normalizeTextForPdf(genericMatch[1].replace(/:$/, ""))
  if (!isLikelySectionTitle(heading) || !SECTION_TITLE_HINT_PATTERN.test(heading)) {
    return null
  }

  const remainder = normalizeTextForPdf(genericMatch[2])
  if (!remainder) {
    return null
  }

  return {
    title: heading,
    remainder,
  }
}

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const normalized = normalizeMarkdown(value || "")
  const withHeadingBreaks = normalized.replace(/\s+(#{1,6}\s)/g, "\n$1")
  const lines = withHeadingBreaks.split("\n")
  const blocks: MarkdownBlock[] = []
  let paragraphParts: string[] = []

  const flushParagraph = () => {
    if (paragraphParts.length === 0) {
      return
    }
    const paragraph = stripMarkdownInline(paragraphParts.join(" "))
    if (paragraph) {
      blocks.push({ type: "paragraph", text: paragraph })
    }
    paragraphParts = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      blocks.push({ type: "spacer" })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph()
      blocks.push({ type: "spacer" })
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flushParagraph()
      const text = normalizeTextForPdf(stripMarkdownInline(headingMatch[2]))
      if (text) {
        blocks.push({
          type: "heading",
          level: headingMatch[1].length,
          text,
        })
      }
      continue
    }

    const inlineHeading = splitInlineSectionHeading(line)
    if (inlineHeading) {
      flushParagraph()
      blocks.push({ type: "heading", level: 2, text: inlineHeading.title })
      blocks.push({ type: "paragraph", text: inlineHeading.remainder })
      continue
    }

    const plainHeading = normalizeTextForPdf(line.replace(/:$/, ""))
    if (plainHeading && isLikelySectionTitle(plainHeading)) {
      flushParagraph()
      blocks.push({ type: "heading", level: 2, text: plainHeading })
      continue
    }

    const bulletMatch = /^[-*+\u2022]\s+(.*)$/.exec(line)
    if (bulletMatch) {
      flushParagraph()
      const text = normalizeTextForPdf(stripMarkdownInline(bulletMatch[1]))
      if (text) {
        blocks.push({ type: "bullet", text })
      }
      continue
    }

    const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(line)
    if (numberedMatch) {
      flushParagraph()
      const text = normalizeTextForPdf(
        stripMarkdownInline(`${numberedMatch[1]}. ${numberedMatch[2]}`)
      )
      if (text) {
        blocks.push({ type: "bullet", text })
      }
      continue
    }

    paragraphParts.push(line)
  }

  flushParagraph()
  return collapseSpacers(blocks)
}

function createFallbackSummary(input: TailoredResumePdfInput): string {
  const sectionMap = new Map<string, string[]>()

  for (const change of input.changes) {
    const section = normalizeTextForPdf(change.section || "") || "Experience"
    const tailored = normalizeTextForPdf(change.tailored || "")
    if (!tailored) {
      continue
    }

    if (!sectionMap.has(section)) {
      sectionMap.set(section, [])
    }

    sectionMap.get(section)?.push(tailored)
  }

  if (sectionMap.size === 0) {
    const keywords = input.keywords
      .map((keyword) => normalizeTextForPdf(keyword))
      .filter((keyword) => keyword.length > 0)

    if (keywords.length === 0) {
      return ""
    }

    return `## Skills\n${keywords.map((keyword) => `- ${keyword}`).join("\n")}`
  }

  const parts: string[] = []

  for (const [section, values] of sectionMap) {
    parts.push(`## ${section}`)
    for (const value of values) {
      parts.push(`- ${value}`)
    }
    parts.push("")
  }

  return parts.join("\n").trim()
}

function looksLikeNameLine(value: string): boolean {
  if (!value || value.length > 64) {
    return false
  }

  if (/[|@:/\\]/.test(value) || /\d/.test(value)) {
    return false
  }

  const words = value.trim().split(/\s+/)
  if (words.length < 2 || words.length > 5) {
    return false
  }

  return words.every((word) => /^[A-Za-z.'-]+$/.test(word))
}

function looksLikeContactLine(value: string): boolean {
  return (
    /@/.test(value) ||
    /\+?\d[\d\s().-]{6,}/.test(value) ||
    /\b(linkedin|github|portfolio|website)\b/i.test(value) ||
    /https?:\/\//i.test(value) ||
    /[|]/.test(value)
  )
}

function extractNameFromContactLine(value: string): string {
  const prefix = value.split("|")[0]?.trim() || ""
  if (!prefix) {
    return ""
  }

  const beforeLocation = prefix.split(",")[0]?.trim() || prefix
  const words = beforeLocation
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z.'-]/g, ""))
    .filter((word) => word.length > 0)

  if (words.length < 2) {
    return ""
  }

  const probableName = words.slice(0, Math.min(words.length, 3))
  if (!probableName.every((word) => /^[A-Z][A-Za-z.'-]*$/.test(word))) {
    return ""
  }

  return probableName.join(" ")
}

function stripNamePrefixFromContact(value: string, name: string): string {
  const contact = normalizeTextForPdf(value)
  const normalizedName = normalizeTextForPdf(name)
  if (!contact || !normalizedName) {
    return contact
  }

  const escapedName = escapeRegex(normalizedName)
  const separatorPattern = /\s*[,|\-]\s*/
  const namePrefixPattern = new RegExp(
    `^${escapedName}(?:${separatorPattern.source}|\\s+)`,
    "i"
  )

  let stripped = contact
  while (namePrefixPattern.test(stripped)) {
    stripped = stripped.replace(namePrefixPattern, "")
  }

  return stripped.replace(/^[\s,|\-]+/, "").trim()
}

function toSectionTitle(value: string): string {
  const text = normalizeTextForPdf(value).replace(/:$/, "")
  const key = normalizeSectionKey(text)

  if (SECTION_TITLE_MAP[key]) {
    return SECTION_TITLE_MAP[key]
  }

  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 5)

  if (words.length === 0) {
    return "Professional Summary"
  }

  if (/^[A-Z0-9 &/+\-]{3,40}$/.test(text.trim())) {
    return text.trim()
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function parseResumeLayout(input: TailoredResumePdfInput): ResumeLayout {
  const cleanedSummary = sanitizeTailoredResumeText(input.summary || "")
  const cleanedSource = sanitizeTailoredResumeText(input.sourceResumeText || "")
  const resolvedSummary = cleanedSummary || cleanedSource || createFallbackSummary(input)
  const blocks = parseMarkdownBlocks(resolvedSummary)
  const sections: ResumeSection[] = []

  const layout: ResumeLayout = {
    name: "",
    contactLine: "",
    sections,
  }

  let currentSection: ResumeSection | null = null

  const ensureCurrentSection = (title = "Professional Summary") => {
    if (currentSection) {
      return currentSection
    }

    currentSection = {
      title: toSectionTitle(title),
      blocks: [],
    }
    sections.push(currentSection)
    return currentSection
  }

  const startSection = (title: string) => {
    currentSection = {
      title: toSectionTitle(title),
      blocks: [],
    }
    sections.push(currentSection)
  }

  const appendParagraph = (text: string) => {
    const sanitized = normalizeTextForPdf(text)
    if (!sanitized) {
      return
    }
    ensureCurrentSection().blocks.push({
      type: "paragraph",
      text: sanitized,
    })
  }

  const appendBullet = (text: string) => {
    const sanitized = normalizeTextForPdf(text)
    if (!sanitized) {
      return
    }
    ensureCurrentSection().blocks.push({
      type: "bullet",
      text: sanitized,
    })
  }

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const headingText = normalizeTextForPdf(block.text)
        if (!headingText) {
          break
        }

        if (
          !layout.name &&
          block.level === 1 &&
          !isLikelySectionTitle(headingText)
        ) {
          layout.name = headingText
          break
        }

        startSection(headingText)
        break
      }
      case "paragraph": {
        const paragraphText = normalizeTextForPdf(block.text)
        if (!paragraphText) {
          break
        }

        if (!layout.name && looksLikeContactLine(paragraphText)) {
          const extractedName = extractNameFromContactLine(paragraphText)
          if (extractedName) {
            layout.name = extractedName
            layout.contactLine =
              stripNamePrefixFromContact(paragraphText, extractedName) ||
              paragraphText
            break
          }
        }

        if (!layout.name && looksLikeNameLine(paragraphText)) {
          layout.name = paragraphText
          break
        }

        if (
          layout.name &&
          !layout.contactLine &&
          sections.length === 0 &&
          looksLikeContactLine(paragraphText)
        ) {
          layout.contactLine =
            stripNamePrefixFromContact(paragraphText, layout.name) ||
            paragraphText
          break
        }

        if (isLikelySectionTitle(paragraphText) && sections.length > 0) {
          startSection(paragraphText)
          break
        }

        appendParagraph(paragraphText)
        break
      }
      case "bullet":
        appendBullet(block.text)
        break
      case "spacer":
      default:
        break
    }
  }

  if (!layout.name && cleanedSource) {
    const sourceLines = normalizeMarkdown(cleanedSource)
      .split("\n")
      .map((line) => normalizeTextForPdf(line))
      .filter((line) => line.length > 0)

    const sourceName = sourceLines.find((line) => looksLikeNameLine(line))
    if (sourceName) {
      layout.name = sourceName
    }

    if (!layout.contactLine) {
      const sourceContact = sourceLines.find((line) => looksLikeContactLine(line))
      if (sourceContact) {
        layout.contactLine =
          stripNamePrefixFromContact(sourceContact, layout.name || sourceName || "") ||
          sourceContact
      }
    }
  }

  if (!layout.name) {
    layout.name = "Resume"
  }

  for (let index = sections.length - 1; index >= 0; index -= 1) {
    if (sections[index].blocks.length === 0) {
      sections.splice(index, 1)
    }
  }

  if (sections.length === 0) {
    const paragraphSource = normalizeTextForPdf(resolvedSummary)
    sections.push({
      title: "Professional Summary",
      blocks: [
        {
          type: "paragraph",
          text: paragraphSource || "Resume content is unavailable.",
        },
      ],
    })
  }

  return layout
}

function escapeLatex(value: string): string {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([#$%&_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
}

function renderSectionToLatex(blocks: ResumeBlock[]): string {
  const lines: string[] = []
  let insideList = false

  for (const block of blocks) {
    if (block.type === "bullet") {
      if (!insideList) {
        lines.push("\\begin{itemize}[leftmargin=*,itemsep=0.15em,topsep=0.2em]")
        insideList = true
      }
      lines.push(`\\item ${escapeLatex(block.text)}`)
      continue
    }

    if (insideList) {
      lines.push("\\end{itemize}")
      insideList = false
    }
    lines.push(`${escapeLatex(block.text)}\\par`)
  }

  if (insideList) {
    lines.push("\\end{itemize}")
  }

  return lines.join("\n")
}

function buildLatexSource(layout: ResumeLayout): string {
  const sectionsSource = layout.sections
    .map(
      (section) =>
        `\\section*{${escapeLatex(section.title)}}\n${renderSectionToLatex(section.blocks)}`
    )
    .join("\n\n")

  const contactLine = layout.contactLine
    ? `{\n\\small ${escapeLatex(layout.contactLine)}\\\\\n}`
    : ""

  return `\\documentclass[11pt,letterpaper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.65in]{geometry}
\\usepackage[hidelinks]{hyperref}
\\usepackage{enumitem}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.25em}
\\pagenumbering{gobble}

\\begin{document}
\\begin{center}
{\\LARGE \\textbf{${escapeLatex(layout.name)}}}\\\\[0.2em]
${contactLine}
\\end{center}
\\vspace{0.35em}
\\hrule
\\vspace{0.5em}

${sectionsSource}

\\end{document}
`
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF"
}

function decodePdfBase64(value: string): Buffer | null {
  const base64 = value.replace(/^data:application\/pdf;base64,/i, "").trim()
  if (!base64) {
    return null
  }

  try {
    const buffer = Buffer.from(base64, "base64")
    return isPdfBuffer(buffer) ? buffer : null
  } catch {
    return null
  }
}

function extractPdfFromJson(value: unknown): Buffer | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const payload = value as Record<string, unknown>
  const encoded =
    (typeof payload.pdfBase64 === "string" && payload.pdfBase64) ||
    (typeof payload.pdf === "string" && payload.pdf) ||
    (typeof payload.data === "string" && payload.data)

  if (!encoded) {
    return null
  }

  return decodePdfBase64(encoded)
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function renderWithRemoteLatex(latexSource: string): Promise<Buffer | null> {
  const endpoint = process.env.LATEX_RESUME_RENDER_URL?.trim()
  if (!endpoint) {
    return null
  }

  const token = process.env.LATEX_RESUME_RENDER_TOKEN?.trim()

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/pdf, application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          source: latexSource,
          inputFormat: "latex",
          outputFormat: "pdf",
        }),
      },
      20_000
    )

    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() || ""
    if (contentType.includes("application/pdf")) {
      const bytes = Buffer.from(await response.arrayBuffer())
      return isPdfBuffer(bytes) ? bytes : null
    }

    const jsonPayload = await response.json().catch(() => null)
    return extractPdfFromJson(jsonPayload)
  } catch {
    return null
  }
}

function renderSectionHeader(
  doc: PdfDocumentInstance,
  title: string,
  pageWidth: number
): void {
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#111111")
  doc.text(title.toUpperCase(), { width: pageWidth })

  const lineY = doc.y + 1
  doc
    .moveTo(doc.page.margins.left, lineY)
    .lineTo(doc.page.width - doc.page.margins.right, lineY)
    .lineWidth(0.5)
    .strokeColor("#d4d4d8")
    .stroke()

  doc.moveDown(0.35)
}

function renderSectionBlocks(
  doc: PdfDocumentInstance,
  blocks: ResumeBlock[],
  pageWidth: number
): void {
  for (const block of blocks) {
    if (block.type === "paragraph") {
      doc.font("Helvetica").fontSize(10.5).fillColor("#111111")
      doc.text(block.text, {
        width: pageWidth,
        lineGap: 1.5,
      })
      doc.moveDown(0.25)
      continue
    }

    doc.font("Helvetica").fontSize(10.25).fillColor("#111111")
    doc.text(`- ${block.text}`, {
      width: pageWidth,
      indent: 12,
      lineGap: 1.5,
    })
    doc.moveDown(0.1)
  }
}

function renderLayoutWithPdfKit(layout: ResumeLayout): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 52, bottom: 52, left: 54, right: 54 },
    compress: true,
  })

  doc.info.Title = layout.name || "Resume"
  doc.info.Author = "Job Scout"
  doc.info.Subject = "Resume"

  const stream = new PassThrough()
  const chunks: Buffer[] = []

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })

  doc.pipe(stream)

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#111111")
  doc.text(layout.name, {
    width: pageWidth,
    align: "center",
  })

  if (layout.contactLine) {
    doc.moveDown(0.15)
    doc.font("Helvetica").fontSize(9.5).fillColor("#4b5563")
    doc.text(layout.contactLine, {
      width: pageWidth,
      align: "center",
    })
  }

  doc.moveDown(0.35)
  const dividerY = doc.y
  doc
    .moveTo(doc.page.margins.left, dividerY)
    .lineTo(doc.page.width - doc.page.margins.right, dividerY)
    .lineWidth(0.75)
    .strokeColor("#d4d4d8")
    .stroke()
  doc.moveDown(0.6)

  for (const [index, section] of layout.sections.entries()) {
    if (index > 0) {
      doc.moveDown(0.45)
    }

    renderSectionHeader(doc, section.title, pageWidth)
    renderSectionBlocks(doc, section.blocks, pageWidth)
  }

  doc.end()

  return done
}

export function buildTailoredResumeLatexSource(
  input: TailoredResumePdfInput
): string {
  return buildLatexSource(parseResumeLayout(input))
}

export async function renderTailoredResumePdf(
  input: TailoredResumePdfInput
): Promise<Buffer> {
  const layout = parseResumeLayout(input)
  const latexSource = buildLatexSource(layout)
  const latexPdf = await renderWithRemoteLatex(latexSource)

  if (latexPdf) {
    return latexPdf
  }

  return renderLayoutWithPdfKit(layout)
}
