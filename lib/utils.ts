import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Comprehensive text sanitization to fix encoding issues and clean up malformed text
 * Handles UTF-8 mojibake, control characters, and common corruption patterns
 * Preserves LaTeX/KaTeX math expressions
 */
export function sanitizeText(text: string): string {
  if (!text) return text

  // Store LaTeX expressions to protect them during sanitization
  const mathExpressions: string[] = []
  const MATH_PLACEHOLDER = "___MATH_EXPR___"

  // Extract and protect inline math ($...$) and display math ($$...$$, \[...\], \(...\))
  let cleaned = text
    // Display math with $$...$$
    .replace(/\$\$[\s\S]*?\$\$/g, (match) => {
      mathExpressions.push(match)
      return `${MATH_PLACEHOLDER}${
        mathExpressions.length - 1
      }${MATH_PLACEHOLDER}`
    })
    // Display math with \[...\]
    .replace(/\\\[[\s\S]*?\\\]/g, (match) => {
      mathExpressions.push(match)
      return `${MATH_PLACEHOLDER}${
        mathExpressions.length - 1
      }${MATH_PLACEHOLDER}`
    })
    // Inline math with \(...\)
    .replace(/\\\([\s\S]*?\\\)/g, (match) => {
      mathExpressions.push(match)
      return `${MATH_PLACEHOLDER}${
        mathExpressions.length - 1
      }${MATH_PLACEHOLDER}`
    })
    // Inline math with $...$
    .replace(/\$[^\$\n]+?\$/g, (match) => {
      mathExpressions.push(match)
      return `${MATH_PLACEHOLDER}${
        mathExpressions.length - 1
      }${MATH_PLACEHOLDER}`
    })

  // First pass: Fix literal \n sequences that should be line breaks
  cleaned = cleaned.replace(/\\n/g, "\n")

  // Remove or fix control characters (except newlines, tabs, and carriage returns)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")

  // Remove zero-width characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "")

  // Fix common mojibake patterns - Apostrophes and quotes
  cleaned = cleaned
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€›/g, "'")
    .replace(/â€š/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\u009D/g, '"')
    .replace(/â€ž/g, '"')
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Å/g, '"')
    .replace(/Ã¢â‚¬\u009D/g, '"')
    .replace(/â€²/g, "'")
    .replace(/â€³/g, '"')
    .replace(/â€/g, "'") // Generic corrupted apostrophe/quote

  // Fix checkbox and bullet characters
  cleaned = cleaned
    .replace(/â˜\[☐¢/g, "• ") // Corrupted checkbox/bullet combo
    .replace(/â˜\[/g, "☐ ") // Ballot box
    .replace(/â˜'/g, "☐ ") // Empty checkbox
    .replace(/â˜\"/g, "☑ ") // Checked box
    .replace(/â˜"/g, "✓ ") // Check mark
    .replace(/â˜•/g, "✓ ") // Another check variant
    .replace(/â˜/g, "") // Remove stray checkbox artifacts
    .replace(/â¢/g, "• ")
    .replace(/â€¢/g, "• ")
    .replace(/â—/g, "• ")
    .replace(/âˆ™/g, "• ")
    .replace(/â—\u008F/g, "• ")
    .replace(/â¦/g, "• ")
    .replace(/Â·/g, "• ")
    .replace(/â—\u008B/g, "◦ ")
    .replace(/â—¦/g, "◦ ")
    .replace(/Â¡/g, "• ")

  // Fix dashes and hyphens
  cleaned = cleaned
    .replace(/â€"/g, "–")
    .replace(/â€"/g, "—")
    .replace(/â€•/g, "—")
    .replace(/â€"/g, "-")
    .replace(/â€'/g, "-")
    .replace(/â€/g, "-")
    .replace(/â€/g, "–")
    .replace(/â€Ž/g, "-")

  // Fix ellipsis
  cleaned = cleaned.replace(/â€¦/g, "…").replace(/\.\.\.+/g, "…")

  // Fix non-breaking spaces and other space issues
  cleaned = cleaned
    .replace(/Â /g, " ")
    .replace(/Â/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\u2009/g, " ")
    .replace(/\u202F/g, " ")

  // Fix common symbols
  cleaned = cleaned
    .replace(/â„¢/g, "™")
    .replace(/Â©/g, "©")
    .replace(/Â®/g, "®")
    .replace(/â†'/g, "→")
    .replace(/â†"/g, "←")
    .replace(/â†'/g, "↑")
    .replace(/â†"/g, "↓")
    .replace(/âœ"/g, "✓")
    .replace(/âœ—/g, "✗")
    .replace(/âœ"/g, "✓")
    .replace(/âœ˜/g, "✗")
    .replace(/â€º/g, "›")
    .replace(/â€¹/g, "‹")
    .replace(/Â«/g, "«")
    .replace(/Â»/g, "»")

  // Fix fractions
  cleaned = cleaned
    .replace(/Â½/g, "½")
    .replace(/Â¼/g, "¼")
    .replace(/Â¾/g, "¾")
    .replace(/â…/g, "⅓")
    .replace(/â…"/g, "⅔")
    .replace(/â…'/g, "⅛")

  // Fix math symbols
  cleaned = cleaned
    .replace(/Ã—/g, "×")
    .replace(/Ã·/g, "÷")
    .replace(/â‰¤/g, "≤")
    .replace(/â‰¥/g, "≥")
    .replace(/â‰ /g, "≠")
    .replace(/â‰ˆ/g, "≈")
    .replace(/Â±/g, "±")
    .replace(/âˆ'/g, "∞")
    .replace(/âˆš/g, "√")
    .replace(/Â°/g, "°")

  // Fix accented characters (Latin-1 Supplement)
  cleaned = cleaned
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ãª/g, "ê")
    .replace(/Ã«/g, "ë")
    .replace(/Ã¡/g, "á")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã£/g, "ã")
    .replace(/Ã¤/g, "ä")
    .replace(/Ã¥/g, "å")
    .replace(/Ã­/g, "í")
    .replace(/Ã¬/g, "ì")
    .replace(/Ã®/g, "î")
    .replace(/Ã¯/g, "ï")
    .replace(/Ã³/g, "ó")
    .replace(/Ã²/g, "ò")
    .replace(/Ã´/g, "ô")
    .replace(/Ãµ/g, "õ")
    .replace(/Ã¶/g, "ö")
    .replace(/Ãº/g, "ú")
    .replace(/Ã¹/g, "ù")
    .replace(/Ã»/g, "û")
    .replace(/Ã¼/g, "ü")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã§/g, "ç")
    .replace(/Ã†/g, "Æ")
    .replace(/Ã¦/g, "æ")
    .replace(/Å\u0093/g, "œ")
    .replace(/Å'/g, "Œ")
    .replace(/Ã\u009F/g, "ß")
    .replace(/Ã˜/g, "Ø")
    .replace(/Ã¸/g, "ø")
    .replace(/Ã…/g, "Å")

  // Fix currency symbols
  cleaned = cleaned
    .replace(/â‚¬/g, "€")
    .replace(/Â£/g, "£")
    .replace(/Â¥/g, "¥")
    .replace(/Â¢/g, "¢")

  // Fix degree and other scientific symbols
  cleaned = cleaned.replace(/ÂµÂ/g, "µ").replace(/Âµ/g, "µ")

  // Clean up multiple spaces (but preserve single spaces)
  cleaned = cleaned.replace(/[ \t]+/g, " ")

  // Clean up multiple newlines (max 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

  // Trim each line
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .join("\n")

  // Trim overall
  cleaned = cleaned.trim()

  // Restore protected math expressions
  mathExpressions.forEach((expr, index) => {
    cleaned = cleaned.replace(
      `${MATH_PLACEHOLDER}${index}${MATH_PLACEHOLDER}`,
      expr
    )
  })

  return cleaned
}
