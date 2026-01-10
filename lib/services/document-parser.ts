import mammoth from "mammoth"
import { createRequire } from "module"

export interface ParsedDocument {
  text: string
  pageCount?: number
  metadata?: Record<string, unknown>
}

// Initialize DOMMatrix polyfill once at module load time
// This ensures it's available before pdf-parse is loaded
let dommatrixPolyfillInitialized = false

async function initializeDOMMatrixPolyfill() {
  if (dommatrixPolyfillInitialized) {
    return
  }

  // Only polyfill in Node.js environment (server-side)
  if (typeof window === "undefined" && typeof globalThis.DOMMatrix === "undefined") {
    try {
      const dommatrix = await import("node-dommatrix")
      if (dommatrix.DOMMatrix) {
        globalThis.DOMMatrix = dommatrix.DOMMatrix as any
      }
      if (dommatrix.DOMMatrixReadOnly) {
        globalThis.DOMMatrixReadOnly = dommatrix.DOMMatrixReadOnly as any
      }
      dommatrixPolyfillInitialized = true
    } catch (error) {
      console.warn("Failed to initialize DOMMatrix polyfill:", error)
      // Don't throw - some environments might have it already
    }
  } else {
    dommatrixPolyfillInitialized = true
  }
}

/**
 * Parse PDF document and extract text
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

  // Initialize polyfill before loading pdf-parse
  await initializeDOMMatrixPolyfill()

  let parser: any = null

  try {
    // Load pdf-parse module
    const require = createRequire(import.meta.url)
    const pdfParseModule = require("pdf-parse")

    if (!pdfParseModule || typeof pdfParseModule.PDFParse !== "function") {
      const availableExports = pdfParseModule ? Object.keys(pdfParseModule) : []
      throw new Error(
        `PDFParse class not found. Available exports: ${availableExports.join(", ")}`
      )
    }

    const PDFParse = pdfParseModule.PDFParse

    // Create parser instance
    parser = new PDFParse({ data: buffer })

    if (!parser) {
      throw new Error("Failed to create PDF parser instance")
    }

    // Extract text - handle different possible return structures
    const textResult = await parser.getText()
    
    // Validate and extract text
    let extractedText = ""
    let pageCount: number | undefined = undefined

    // Handle different possible return structures from getText()
    if (typeof textResult === "string") {
      extractedText = textResult
    } else if (textResult && typeof textResult === "object") {
      // Check for various possible properties
      if (typeof textResult.text === "string") {
        extractedText = textResult.text
      } else if (Array.isArray(textResult.pages)) {
        // If it returns pages array, join them
        extractedText = textResult.pages
          .map((page: any) => {
            if (typeof page === "string") return page
            if (page && typeof page.text === "string") return page.text
            return ""
          })
          .filter((text: string) => text.length > 0)
          .join("\n")
      } else if (textResult.toString && typeof textResult.toString === "function") {
        extractedText = String(textResult)
      } else {
        // Try to stringify the object as fallback
        extractedText = JSON.stringify(textResult)
      }

      // Extract page count if available
      if (typeof textResult.total === "number") {
        pageCount = textResult.total
      } else if (typeof textResult.pageCount === "number") {
        pageCount = textResult.pageCount
      } else if (Array.isArray(textResult.pages)) {
        pageCount = textResult.pages.length
      }
    } else if (textResult != null) {
      extractedText = String(textResult)
    }

    // If we still don't have text, try getInfo() to get metadata
    let metadata: Record<string, unknown> = {}
    try {
      const info = await parser.getInfo()
      if (info && typeof info === "object") {
        metadata = info.info || info.metadata || info
        // Extract page count from info if not already found
        if (pageCount === undefined) {
          if (typeof info.total === "number") {
            pageCount = info.total
          } else if (typeof info.pageCount === "number") {
            pageCount = info.pageCount
          }
        }
      }
    } catch (infoError) {
      // Info extraction is optional, continue without it
      console.warn("Failed to extract PDF metadata:", infoError)
    }

    // Validate that we extracted some text
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the PDF document")
    }

    // Clean and return the parsed data
    return {
      text: cleanText(extractedText),
      pageCount,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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
  } finally {
    // Always cleanup parser to free memory
    if (parser && typeof parser.destroy === "function") {
      try {
        await parser.destroy()
      } catch (destroyError) {
        console.warn("Error destroying PDF parser:", destroyError)
      }
    }
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
