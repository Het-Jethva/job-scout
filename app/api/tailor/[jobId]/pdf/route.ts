import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { jobIdSchema } from "@/lib/validations"
import {
  getTailoredResumeExportData,
  resolveTailoredResumeFilename,
} from "@/lib/domains/tailor/export"
import { renderTailoredResumePdf } from "@/lib/services/latex-resume"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ jobId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { jobId } = await context.params
  const validation = jobIdSchema.safeParse(jobId)

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 })
  }

  const session = await requireAuth()

  try {
    const exportData = await getTailoredResumeExportData(
      session.user.id,
      validation.data
    )

    if (!exportData) {
      return NextResponse.json(
        { error: "Tailored resume not found" },
        { status: 404 }
      )
    }

    const pdfBuffer = await renderTailoredResumePdf({
      jobTitle: exportData.job.title,
      companyName: exportData.job.company,
      summary: exportData.tailoredContent.summary,
      sourceResumeText: exportData.sourceResumeText,
      keywords: exportData.tailoredContent.keywords,
      changes: exportData.tailoredContent.changes.map((change) => ({
        section: change.section,
        tailored: change.tailored,
        reason: change.reason,
      })),
    })

    const filename = resolveTailoredResumeFilename({
      request,
      company: exportData.job.company,
      title: exportData.job.title,
      extension: "pdf",
    })

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
