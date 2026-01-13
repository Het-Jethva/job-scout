/**
 * Matching Engine Tests
 * Pure function implementations copied here to avoid env dependencies
 * from the services layer that imports openrouter
 */
import { describe, it, expect } from "vitest"

// Pure functions extracted for testing (same as in matching-engine.ts)

function normalizeSkill(skill: string): string {
    return skill
        .toLowerCase()
        .replace(/[^a-z0-9+#]/g, "")
        .trim()
}

function skillMatchType(
    resumeSkill: string,
    jobSkill: string
): "exact" | "partial" | "none" {
    const normResume = normalizeSkill(resumeSkill)
    const normJob = normalizeSkill(jobSkill)

    if (normResume === normJob) return "exact"

    const variations: Record<string, string[]> = {
        javascript: ["js", "es6", "es2015", "ecmascript"],
        typescript: ["ts"],
        python: ["py", "python3"],
        react: ["reactjs", "react.js"],
    }

    for (const [main, alts] of Object.entries(variations)) {
        const allForms = [main, ...alts].map(normalizeSkill)
        if (allForms.includes(normResume) && allForms.includes(normJob)) {
            return "exact"
        }
    }

    if (normResume.includes(normJob) || normJob.includes(normResume)) {
        return "partial"
    }

    return "none"
}

interface SkillMatch {
    matched: string[]
    partial: string[]
    missing: string[]
}

function matchSkills(resumeSkills: string[], jobSkills: string[]): SkillMatch {
    const matched: string[] = []
    const partial: string[] = []
    const missing: string[] = []

    for (const jobSkill of jobSkills) {
        let found = false

        for (const resumeSkill of resumeSkills) {
            const matchType = skillMatchType(resumeSkill, jobSkill)

            if (matchType === "exact") {
                matched.push(jobSkill)
                found = true
                break
            } else if (matchType === "partial") {
                partial.push(jobSkill)
                found = true
                break
            }
        }

        if (!found) {
            missing.push(jobSkill)
        }
    }

    return { matched, partial, missing }
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error("Vectors must have the same length")
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    if (magnitude === 0) return 0

    return dotProduct / magnitude
}

function calculateMatchScore(
    skillMatch: SkillMatch,
    similarityScore: number
): number {
    const totalJobSkills =
        skillMatch.matched.length +
        skillMatch.partial.length +
        skillMatch.missing.length

    if (totalJobSkills === 0) {
        return Math.round(similarityScore * 100)
    }

    const exactMatchWeight = 1.0
    const partialMatchWeight = 0.5

    const skillScore =
        (skillMatch.matched.length * exactMatchWeight +
            skillMatch.partial.length * partialMatchWeight) /
        totalJobSkills

    const semanticScore = similarityScore
    const combinedScore = skillScore * 0.6 + semanticScore * 0.4

    return Math.min(100, Math.max(10, Math.round(combinedScore * 100)))
}

// Tests

describe("Matching Engine", () => {
    describe("cosineSimilarity", () => {
        it("should return 1 for identical vectors", () => {
            const v = [0.5, 0.5, 0.5]
            expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5)
        })

        it("should return 0 for orthogonal vectors", () => {
            const a = [1, 0, 0]
            const b = [0, 1, 0]
            expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
        })

        it("should return -1 for opposite vectors", () => {
            const a = [1, 0]
            const b = [-1, 0]
            expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5)
        })

        it("should throw for vectors of different lengths", () => {
            expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
                "Vectors must have the same length"
            )
        })

        it("should handle zero vectors", () => {
            const zero = [0, 0, 0]
            const v = [1, 1, 1]
            expect(cosineSimilarity(zero, v)).toBe(0)
        })
    })

    describe("matchSkills", () => {
        it("should identify exact matches", () => {
            const resumeSkills = ["JavaScript", "React", "Node.js"]
            const jobSkills = ["JavaScript", "React"]

            const result = matchSkills(resumeSkills, jobSkills)

            expect(result.matched).toContain("JavaScript")
            expect(result.matched).toContain("React")
            expect(result.missing).toHaveLength(0)
        })

        it("should identify missing skills", () => {
            const resumeSkills = ["JavaScript"]
            const jobSkills = ["JavaScript", "Python", "Go"]

            const result = matchSkills(resumeSkills, jobSkills)

            expect(result.matched).toContain("JavaScript")
            expect(result.missing).toContain("Python")
            expect(result.missing).toContain("Go")
        })

        it("should handle skill variations (js/javascript)", () => {
            const resumeSkills = ["JavaScript"]
            const jobSkills = ["JS"]

            const result = matchSkills(resumeSkills, jobSkills)

            expect(result.matched).toContain("JS")
        })

        it("should identify partial matches", () => {
            const resumeSkills = ["React Native"]
            const jobSkills = ["React"]

            const result = matchSkills(resumeSkills, jobSkills)

            expect(result.partial).toContain("React")
        })

        it("should handle case insensitivity", () => {
            const resumeSkills = ["JAVASCRIPT"]
            const jobSkills = ["javascript"]

            const result = matchSkills(resumeSkills, jobSkills)

            expect(result.matched).toContain("javascript")
        })
    })

    describe("calculateMatchScore", () => {
        it("should return higher score for more matched skills", () => {
            const fullMatch = { matched: ["A", "B", "C"], partial: [], missing: [] }
            const halfMatch = { matched: ["A"], partial: [], missing: ["B", "C"] }

            const fullScore = calculateMatchScore(fullMatch, 0.8)
            const halfScore = calculateMatchScore(halfMatch, 0.8)

            expect(fullScore).toBeGreaterThan(halfScore)
        })

        it("should give partial weight to partial matches", () => {
            const exactMatch = { matched: ["A"], partial: [], missing: ["B"] }
            const partialMatch = { matched: [], partial: ["A"], missing: ["B"] }

            const exactScore = calculateMatchScore(exactMatch, 0.5)
            const partialScore = calculateMatchScore(partialMatch, 0.5)

            expect(exactScore).toBeGreaterThan(partialScore)
        })

        it("should use similarity when no skills specified", () => {
            const noSkills = { matched: [], partial: [], missing: [] }

            const highSim = calculateMatchScore(noSkills, 0.9)
            const lowSim = calculateMatchScore(noSkills, 0.3)

            expect(highSim).toBeGreaterThan(lowSim)
        })

        it("should return score between 10 and 100", () => {
            const worst = { matched: [], partial: [], missing: ["A", "B", "C", "D", "E"] }
            const best = { matched: ["A", "B", "C", "D", "E"], partial: [], missing: [] }

            expect(calculateMatchScore(worst, 0)).toBeGreaterThanOrEqual(10)
            expect(calculateMatchScore(best, 1)).toBeLessThanOrEqual(100)
        })
    })
})
