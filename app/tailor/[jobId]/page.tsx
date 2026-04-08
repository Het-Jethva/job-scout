import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getJob } from "@/app/actions/job-actions"
import { getActiveResume } from "@/app/actions/resume-actions"
import { getTailoredResume } from "@/app/actions/tailor-actions"
import { parseStoredResumeAnalysis } from "@/lib/domains/resume/analysis"
import { mapTailoredResumeToContent } from "@/lib/domains/tailor/presentation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Markdown } from "@/components/ui/markdown"
import { TailorButton, DownloadButton, CopyButton } from "./components"
import { buildTailoredResumeLatexSource } from "@/lib/services/latex-resume"

interface TailorPageProps {
  params: Promise<{ jobId: string }>
}

async function TailorContent({ jobId }: { jobId: string }) {
  const job = await getJob(jobId)

  if (!job) {
    notFound()
  }

  const activeResume = await getActiveResume()

  if (!activeResume) {
    redirect("/resume?message=upload-first")
  }

  const existingTailored = await getTailoredResume(jobId)

  const originalAnalysis = parseStoredResumeAnalysis(activeResume.parsedData)

  const originalData = {
    skills: originalAnalysis?.skills.map((skill) => skill.name) ?? [],
    experience:
      originalAnalysis?.experience.map((experience) => ({
        title: experience.title,
        company: experience.company,
        description: experience.responsibilities.join("\n"),
      })) ?? [],
    summary: originalAnalysis?.summary ?? "",
  }

  const tailoredContent = existingTailored
      ? mapTailoredResumeToContent({
          optimizedText: existingTailored.optimizedText,
          structuredContent: existingTailored.structuredContent,
          changes: existingTailored.changes,
          keywords: existingTailored.keywords,
          atsScore: existingTailored.atsScore,
      })
    : {
        summary: "",
        skills: [],
        experience: [],
        changes: [],
        keywords: [],
        atsScore: undefined,
      }

  const tailoredLatexSource = existingTailored
    ? buildTailoredResumeLatexSource({
        jobTitle: job.title,
        companyName: job.company,
        summary: tailoredContent.summary,
        sourceResumeText: activeResume.rawText,
        keywords: tailoredContent.keywords,
        changes: tailoredContent.changes.map((change) => ({
          section: change.section,
          tailored: change.tailored,
          reason: change.reason,
        })),
      })
    : ""

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href={`/jobs/${jobId}`}>
          <Button
            variant="ghost"
            size="sm"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Job
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Tailor Resume for Position
        </h1>
        <p className="text-muted-foreground mt-2">
          Optimize your resume for &quot;{job.title}&quot; at {job.company}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {!existingTailored ? (
            <Card>
              <CardHeader>
                <CardTitle>Ready to Tailor</CardTitle>
                <CardDescription>
                  Our AI will analyze your resume against this job&apos;s
                  requirements and suggest optimizations while maintaining
                  factual accuracy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <h4 className="font-medium">What we&apos;ll optimize:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Highlight relevant skills that match job requirements
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Rephrase experience bullets with relevant keywords
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Generate a targeted professional summary
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Improve ATS compatibility score
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Factual Accuracy Preserved
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    We only rephrase and reorganize your existing experience. We
                    never add skills or experience you don&apos;t have.
                  </p>
                </div>

                <TailorButton
                  jobId={jobId}
                  hasExisting={false}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tailored Content Tabs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tailored Resume</CardTitle>
                      <CardDescription>
                        Optimized for {job.title} at {job.company}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <CopyButton
                        content={tailoredLatexSource}
                        successMessage="LaTeX copied to clipboard!"
                      />
                      <DownloadButton
                        jobId={jobId}
                        filename={`resume-${job.company
                          .toLowerCase()
                          .replace(/\s+/g, "-")}.pdf`}
                        format="pdf"
                      />
                      <DownloadButton
                        jobId={jobId}
                        filename={`resume-${job.company
                          .toLowerCase()
                          .replace(/\s+/g, "-")}.tex`}
                        format="latex"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="summary">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="skills">Skills</TabsTrigger>
                      <TabsTrigger value="experience">Experience</TabsTrigger>
                      <TabsTrigger value="changes">Changes</TabsTrigger>
                      <TabsTrigger value="latex">LaTeX</TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="summary"
                      className="mt-4"
                    >
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">
                            Tailored Summary
                          </h4>
                          <div className="p-4 bg-muted rounded-lg">
                            {tailoredContent.summary ? (
                              <Markdown>{tailoredContent.summary}</Markdown>
                            ) : (
                              <span className="text-muted-foreground">
                                No summary generated
                              </span>
                            )}
                          </div>
                        </div>
                        {originalData.summary && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                              Original Summary
                            </h4>
                            <div className="p-4 bg-muted/50 rounded-lg text-muted-foreground">
                              <Markdown>{originalData.summary}</Markdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="skills"
                      className="mt-4"
                    >
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">
                            Prioritized Skills (Ordered by relevance)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {tailoredContent.skills.length > 0 ? (
                              tailoredContent.skills.map((skill, i) => (
                                <Badge
                                  key={skill}
                                  variant={i < 5 ? "default" : "secondary"}
                                >
                                  {skill}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">
                                No skills tailored
                              </span>
                            )}
                          </div>
                        </div>
                        {tailoredContent.keywords.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                              Keywords to Include
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {tailoredContent.keywords.map((kw) => (
                                <Badge
                                  key={kw}
                                  variant="outline"
                                >
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="experience"
                      className="mt-4"
                    >
                      <div className="space-y-4">
                        {tailoredContent.experience.length > 0 ? (
                          tailoredContent.experience.map((exp, i) => (
                            <div
                              key={i}
                              className="p-4 bg-muted rounded-lg"
                            >
                              <h4 className="font-medium">{exp.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {exp.company}
                              </p>
                              <div className="mt-2 text-sm">
                                <Markdown>{exp.description}</Markdown>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            No experience tailored
                          </span>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="changes"
                      className="mt-4"
                    >
                      <div className="space-y-4">
                        {tailoredContent.changes.length > 0 ? (
                          tailoredContent.changes.map((change, i) => (
                            <div
                              key={i}
                              className="border rounded-lg overflow-hidden"
                            >
                              <div className="bg-muted px-4 py-2 border-b">
                                <span className="font-medium">
                                  {change.section}
                                </span>
                              </div>
                              <div className="p-4 space-y-3">
                                <div>
                                  <span className="text-xs text-muted-foreground">
                                    Original:
                                  </span>
                                  <div className="text-sm line-through text-muted-foreground">
                                    <Markdown>{change.original}</Markdown>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs text-green-600">
                                    Tailored:
                                  </span>
                                  <div className="text-sm">
                                    <Markdown>{change.tailored}</Markdown>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground italic">
                                  Why: {change.reason}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground">
                            No specific changes tracked
                          </span>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="latex"
                      className="mt-4"
                    >
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Generated LaTeX Source
                        </h4>
                        <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap break-words">
                          {tailoredLatexSource}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Re-tailor option */}
              <Card>
                <CardHeader>
                  <CardTitle>Not satisfied?</CardTitle>
                  <CardDescription>
                    Regenerate the tailored resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TailorButton
                    jobId={jobId}
                    hasExisting={true}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">{job.title}</h4>
                <p className="text-sm text-muted-foreground">{job.company}</p>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {job.isRemote && <Badge>Remote</Badge>}
                {job.jobType && (
                  <Badge variant="secondary">{job.jobType}</Badge>
                )}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Location: </span>
                {job.location}
              </div>
              {job.salary && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Salary: </span>
                  {job.salary}
                </div>
              )}
              <Link href={`/jobs/${job.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  View Full Job Details
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* ATS Score */}
          {existingTailored && typeof tailoredContent.atsScore === "number" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ATS Score</CardTitle>
                <CardDescription>
                  Applicant Tracking System compatibility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div
                    className={`text-4xl font-bold ${
                      tailoredContent.atsScore >= 80
                        ? "text-green-600"
                        : tailoredContent.atsScore >= 60
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {tailoredContent.atsScore}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tailoredContent.atsScore >= 80
                      ? "Excellent - Ready to submit"
                      : tailoredContent.atsScore >= 60
                      ? "Good - Minor improvements possible"
                      : "Needs work - Consider re-tailoring"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Original Resume Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Source Resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">{activeResume.fileName}</p>
              <p className="text-xs text-muted-foreground">
                Uploaded {new Date(activeResume.createdAt).toLocaleDateString()}
              </p>
              <Link href="/resume">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                >
                  Change Resume
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TailorPageSkeleton() {
  return (
    <div className="container py-8">
      <Skeleton className="h-9 w-32 mb-6" />
      <div className="mb-8">
        <Skeleton className="h-9 w-96" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default async function TailorPage({ params }: TailorPageProps) {
  const { jobId } = await params

  return (
    <Suspense fallback={<TailorPageSkeleton />}>
      <TailorContent jobId={jobId} />
    </Suspense>
  )
}
