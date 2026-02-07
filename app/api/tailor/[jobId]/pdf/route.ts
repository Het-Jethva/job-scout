import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { jobIdSchema } from "@/lib/validations"
import { getTailoredResumeForJobUseCase } from "@/lib/domains/tailor/service"
import { mapTailoredResumeToContent } from "@/lib/domains/tailor/presentation"
import { renderTailoredResumePdf } from "@/lib/services/latex-resume"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ jobId: string }>
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(request: Request, context: RouteContext) {
  const { jobId } = await context.params
  const validation = jobIdSchema.safeParse(jobId)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 })
  }

  const session = await requireAuth()

  try {
    const [tailoredResume, job, activeResume] = await Promise.all([
      getTailoredResumeForJobUseCase({
        userId: session.user.id,
        jobId: validation.data,
      }),
      db.job.findUnique({
        where: { id: validation.data },
        select: { title: true, company: true },
      }),
      db.resume.findFirst({
        where: {
          userId: session.user.id,
          isActive: true,
        },
        select: {
          rawText: true,
        },
      }),
    ])

    if (!tailoredResume || !job) {
      return NextResponse.json(
        { error: "Tailored resume not found" },
        { status: 404 }
      )
    }

    const tailoredContent = mapTailoredResumeToContent({
      optimizedText: tailoredResume.optimizedText,
      changes: tailoredResume.changes,
      keywords: tailoredResume.keywords,
      atsScore: tailoredResume.atsScore,
    })

    const pdfBuffer = await renderTailoredResumePdf({
      jobTitle: job.title,
      companyName: job.company,
      summary: tailoredContent.summary,
      sourceResumeText: activeResume?.rawText || "",
      keywords: tailoredContent.keywords,
      changes: tailoredContent.changes.map((change) => ({
        section: change.section,
        tailored: change.tailored,
        reason: change.reason,
      })),
    })

    const safeCompany = sanitizeFilenamePart(job.company || "company")
    const safeTitle = sanitizeFilenamePart(job.title || "role")
    const requestUrl = new URL(request.url)
    const requestedFileName = requestUrl.searchParams.get("filename")
    const fallbackFileName = `${safeCompany}-${safeTitle}-tailored-resume`
    const fileBaseName = sanitizeFilenamePart(
      requestedFileName?.replace(/\.pdf$/i, "") || fallbackFileName
    )
    const filename = `${fileBaseName || fallbackFileName}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.byteLength),
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate tailored resume PDF",
      },
      { status: 500 }
    )
  }
}
