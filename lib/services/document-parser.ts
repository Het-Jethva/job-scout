import mammoth from "mammoth"

export interface ParsedDocument {
  text: string
  pageCount?: number
  metadata?: Record<string, unknown>
}

/**
 * Parse PDF document and extract text using pdfjs-dist
 * Production-ready implementation with comprehensive error handling
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  // Validate input
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid buffer provided for PDF parsing")
  }

  if (buffer.length === 0) {
    throw new Error("Empty buffer provided for PDF parsing")
  }

  try {
    // Dynamically import pdfjs-dist legacy build for Node.js compatibility
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")

    // Load PDF document from buffer
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    })

    const pdfDocument = await loadingTask.promise
    const numPages = pdfDocument.numPages
    let fullText = ""

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Collect text items from the page
      const pageText = textContent.items
        .filter((item) => "str" in item && typeof (item as any).str === "string")
        .map((item) => (item as any).str as string)
        .join(" ")

      fullText += pageText + "\n"
    }

    // Validate that we extracted some text
    if (!fullText || fullText.trim().length === 0) {
      throw new Error("No text could be extracted from the PDF document")
    }

    // Get metadata if available
    let metadata: Record<string, unknown> | undefined
    try {
      const pdfMetadata = await pdfDocument.getMetadata()
      if (pdfMetadata?.info && typeof pdfMetadata.info === "object") {
        metadata = pdfMetadata.info as Record<string, unknown>
      }
    } catch {
      // Metadata extraction is optional, continue without it
    }

    // Clean and return the parsed data
    return {
      text: cleanText(fullText),
      pageCount: numPages,
      metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    console.error("PDF parsing error:", {
      message: errorMessage,
      bufferLength: buffer?.length,
      error,
    })
    throw new Error(`Failed to parse PDF document: ${errorMessage}`)
  }
}

/**
 * Parse DOCX document and extract text
 */
export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid buffer provided for DOCX parsing")
  }

  try {
    const result = await mammoth.extractRawText({ buffer })

    if (!result || !result.value) {
      throw new Error("No text extracted from DOCX document")
    }

    return {
      text: cleanText(result.value),
      metadata: result.messages && result.messages.length > 0
        ? { messages: result.messages }
        : undefined,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    console.error("DOCX parsing error:", errorMessage)
    throw new Error(`Failed to parse DOCX document: ${errorMessage}`)
  }
}

/**
 * Parse plain text document
 */
export async function parseTxt(buffer: Buffer): Promise<ParsedDocument> {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid buffer provided for text parsing")
  }

  try {
    const text = buffer.toString("utf-8")

    if (!text || text.trim().length === 0) {
      throw new Error("Empty text document")
    }

    return {
      text: cleanText(text),
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    console.error("Text parsing error:", errorMessage)
    throw new Error(`Failed to parse text document: ${errorMessage}`)
  }
}

/**
 * Parse document based on file type
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<ParsedDocument> {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid buffer provided")
  }

  if (!fileType || typeof fileType !== "string") {
    throw new Error("Invalid file type provided")
  }

  const mimeType = fileType.toLowerCase().trim()

  try {
    if (mimeType === "application/pdf" || mimeType.endsWith(".pdf")) {
      return await parsePdf(buffer)
    }

    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType.endsWith(".docx")
    ) {
      return await parseDocx(buffer)
    }

    if (mimeType === "text/plain" || mimeType.endsWith(".txt")) {
      return await parseTxt(buffer)
    }

    throw new Error(`Unsupported file type: ${fileType}`)
  } catch (error) {
    // Re-throw with context if it's not already our error
    if (error instanceof Error && error.message.includes("Failed to parse")) {
      throw error
    }
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    throw new Error(`Document parsing failed: ${errorMessage}`)
  }
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  if (!text || typeof text !== "string") {
    return ""
  }

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
  if (!text || typeof text !== "string") {
    return {}
  }

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
