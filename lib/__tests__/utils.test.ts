import { describe, it, expect } from "vitest"
import { sanitizeText, cn } from "../utils"

describe("sanitizeText", () => {
    it("should return empty string for falsy input", () => {
        expect(sanitizeText("")).toBe("")
    })

    it("should clean up multiple spaces", () => {
        expect(sanitizeText("Hello   World")).toBe("Hello World")
        expect(sanitizeText("Hello\t\tWorld")).toBe("Hello World")
    })

    it("should limit consecutive newlines", () => {
        expect(sanitizeText("A\n\n\n\nB")).toBe("A\n\nB")
    })

    it("should trim whitespace from lines", () => {
        expect(sanitizeText("  Hello  ")).toBe("Hello")
        expect(sanitizeText("Line 1  \n  Line 2")).toBe("Line 1\nLine 2")
    })

    it("should remove control characters", () => {
        // Control chars are removed without adding space
        expect(sanitizeText("Hello\x00World")).toBe("HelloWorld")
        expect(sanitizeText("Test\x1F")).toBe("Test")
    })

    it("should remove zero-width characters", () => {
        expect(sanitizeText("Test\u200BWord")).toBe("TestWord")
    })

    it("should preserve LaTeX inline math expressions", () => {
        const input = "The formula is $E = mc^2$ inline"
        const result = sanitizeText(input)
        expect(result).toContain("$E = mc^2$")
    })

    it("should handle escaped newlines", () => {
        // Literal \n in text should become actual newline
        expect(sanitizeText("Line1\\nLine2")).toBe("Line1\nLine2")
    })
})

describe("cn", () => {
    it("should merge class names", () => {
        expect(cn("foo", "bar")).toBe("foo bar")
    })

    it("should handle conditional classes", () => {
        expect(cn("base", true && "active", false && "inactive")).toBe("base active")
    })

    it("should dedupe tailwind classes", () => {
        expect(cn("p-4", "p-2")).toBe("p-2")
        expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
    })

    it("should handle arrays", () => {
        expect(cn(["foo", "bar"])).toBe("foo bar")
    })

    it("should handle undefined and null", () => {
        expect(cn("foo", undefined, null, "bar")).toBe("foo bar")
    })
})
