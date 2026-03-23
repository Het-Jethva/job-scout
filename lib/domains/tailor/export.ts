import { findActiveResumeByUserId } from "@/lib/domains/resume/repository"
import { mapTailoredResumeToContent } from "@/lib/domains/tailor/presentation"
import { getTailoredResumeForJobUseCase } from "@/lib/domains/tailor/service"
import { db } from "@/lib/db"

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function getTailoredResumeExportData(userId: string, jobId: string) {
  const [tailoredResume, job, activeResume] = await Promise.all([
    getTailoredResumeForJobUseCase({
      userId,
      jobId,
    }),
    db.job.findUnique({
      where: { id: jobId },
      select: { title: true, company: true },
    }),
    findActiveResumeByUserId(userId),
  ])

  if (!tailoredResume || !job) {
    return null
  }

  const tailoredContent = mapTailoredResumeToContent({
    optimizedText: tailoredResume.optimizedText,
    changes: tailoredResume.changes,
    keywords: tailoredResume.keywords,
    atsScore: tailoredResume.atsScore,
  })

  return {
    job,
    sourceResumeText: activeResume?.rawText || "",
    tailoredContent,
  }
}

export function resolveTailoredResumeFilename(input: {
  request: Request
  company: string
  title: string
  extension: "pdf" | "tex"
}) {
  const safeCompany = sanitizeFilenamePart(input.company || "company")
  const safeTitle = sanitizeFilenamePart(input.title || "role")
  const requestUrl = new URL(input.request.url)
  const requestedFileName = requestUrl.searchParams.get("filename")
  const fallbackFileName = `${safeCompany}-${safeTitle}-tailored-resume`
  const fileBaseName = sanitizeFilenamePart(
    requestedFileName?.replace(new RegExp(`\\.${input.extension}$`, "i"), "") ||
      fallbackFileName
  )

  return `${fileBaseName || fallbackFileName}.${input.extension}`
}
