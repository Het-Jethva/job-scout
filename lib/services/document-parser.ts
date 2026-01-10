import mammoth from "mammoth"

export interface ParsedDocument {
  text: string
  pageCount?: number
  metadata?: Record<string, unknown>
}

/**
 * Parse PDF document and extract text
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // pdf-parse uses export = syntax (CommonJS)
    // We need to dynamically import and handle the module properly
    const pdfParse = await import("pdf-parse").then(
      (mod) => (mod as any).default || mod
    )

    // pdf-parse expects a buffer directly
    const data = await pdfParse(buffer)

    return {
      text: cleanText(data.text),
      pageCount: data.numpages,
      metadata: data.info as Record<string, unknown>,
    }
  } catch (error) {
    console.error("PDF parsing error:", error)
    throw new Error("Failed to parse PDF document")
  }
}

/**
 * Parse DOCX document and extract text
 */
export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return {
      text: cleanText(result.value),
      metadata: { messages: result.messages },
    }
  } catch (_error) {
    throw new Error("Failed to parse DOCX document")
  }
}

/**
 * Parse plain text document
 */
export async function parseTxt(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const text = buffer.toString("utf-8")
    return {
      text: cleanText(text),
    }
  } catch (_error) {
    throw new Error("Failed to parse text document")
  }
}

/**
 * Parse document based on file type
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<ParsedDocument> {
  const mimeType = fileType.toLowerCase()

  if (mimeType === "application/pdf" || mimeType.endsWith(".pdf")) {
    return parsePdf(buffer)
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType.endsWith(".docx")
  ) {
    return parseDocx(buffer)
  }

  if (mimeType === "text/plain" || mimeType.endsWith(".txt")) {
    return parseTxt(buffer)
  }

  throw new Error(`Unsupported file type: ${fileType}`)
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, " ")
      // Remove special characters that are clearly artifacts
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Normalize line breaks
      .replace(/(\r\n|\r|\n)+/g, "\n")
      // Remove multiple spaces
      .replace(/[ \t]+/g, " ")
      // Trim each line
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n")
      .trim()
  )
}

/**
 * Extract sections from resume text
 */
export function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {}

  // Common resume section headers
  const sectionPatterns = [
    {
      key: "contact",
      pattern: /(?:contact|personal)\s*(?:information|details)?/i,
    },
    { key: "summary", pattern: /(?:summary|objective|profile|about)/i },
    { key: "experience", pattern: /(?:experience|employment|work\s*history)/i },
    { key: "education", pattern: /(?:education|academic|qualifications)/i },
    {
      key: "skills",
      pattern: /(?:skills|technical\s*skills|competencies|expertise)/i,
    },
    { key: "projects", pattern: /(?:projects|portfolio)/i },
    {
      key: "certifications",
      pattern: /(?:certifications|certificates|licenses)/i,
    },
    { key: "languages", pattern: /(?:languages)/i },
    { key: "awards", pattern: /(?:awards|achievements|honors)/i },
    { key: "references", pattern: /(?:references)/i },
  ]

  const lines = text.split("\n")
  let currentSection = "header"
  let currentContent: string[] = []

  for (const line of lines) {
    let foundSection = false

    for (const { key, pattern } of sectionPatterns) {
      if (pattern.test(line) && line.length < 50) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim()
        }
        currentSection = key
        currentContent = []
        foundSection = true
        break
      }
    }

    if (!foundSection) {
      currentContent.push(line)
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join("\n").trim()
  }

  return sections
}
