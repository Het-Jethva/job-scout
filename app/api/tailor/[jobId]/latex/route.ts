import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { jobIdSchema } from "@/lib/validations"
import {
  getTailoredResumeExportData,
  resolveTailoredResumeFilename,
} from "@/lib/domains/tailor/export"
import { buildTailoredResumeLatexSource } from "@/lib/services/latex-resume"

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

    const latexSource = buildTailoredResumeLatexSource({
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
      extension: "tex",
    })

    return new NextResponse(latexSource, {
      headers: {
        "Content-Type": "application/x-tex; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate tailored resume LaTeX",
      },
      { status: 500 }
    )
  }
}
