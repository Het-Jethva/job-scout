import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getServerSession } from "@/lib/auth-utils"
import { ensureJobDetails } from "@/lib/domains/jobs/service"
import {
  getActiveResume as getActiveResumeForUser,
} from "@/lib/domains/resume/service"
import { getMatchForActiveResume } from "@/lib/domains/matching/service"
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
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Markdown } from "@/components/ui/markdown"
import { MatchButton, ApplyButton } from "./components"
import { CompanyLogo } from "../components"

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

async function JobContent({ jobId }: { jobId: string }) {
  const job = await ensureJobDetails(jobId)

  if (!job) {
    notFound()
  }

  const session = await getServerSession()
  const [activeResume, existingMatch] = session
    ? await Promise.all([
        getActiveResumeForUser(session.user.id),
        getMatchForActiveResume({
          userId: session.user.id,
          jobId,
        }),
      ])
    : [null, null]

  // Requirements are stored as String[]
  const requirements = job.requirements || []

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/jobs">
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
            Back to Jobs
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <CardDescription className="text-lg">
                    {job.company}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {job.isRemote && <Badge>Remote</Badge>}
                    {job.jobType && (
                      <Badge variant="secondary">{job.jobType}</Badge>
                    )}
                    <Badge variant="outline">{job.source}</Badge>
                  </div>
                </div>
                {job.companyLogo && (
                  <div className="relative w-16 h-16 shrink-0">
                    <CompanyLogo
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-16 h-16 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">
                    Location
                  </span>
                  <p className="font-medium">{job.location}</p>
                </div>
                {job.salary && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Salary
                    </span>
                    <p className="font-medium">{job.salary}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">Posted</span>
                  <p className="font-medium">
                    {new Date(job.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Source</span>
                  <p className="font-medium">{job.source}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Markdown>{job.description}</Markdown>
            </CardContent>
          </Card>

          {/* Requirements */}
          {requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {requirements.map((req: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-2"
                    >
                      <svg
                        className="h-5 w-5 text-primary mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ApplyButton url={job.applyUrl} />

              {activeResume ? (
                <>
                  <MatchButton
                    jobId={job.id}
                    hasExistingMatch={!!existingMatch}
                  />
                  <Link
                    href={`/tailor/${job.id}`}
                    className="block"
                  >
                    <Button
                      variant="secondary"
                      className="w-full"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Tailor Resume
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a resume to calculate match score and tailor your
                    resume
                  </p>
                  <Link href="/resume">
                    <Button
                      variant="secondary"
                      className="w-full"
                    >
                      Upload Resume
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Match Score */}
          {existingMatch && (
            <Card>
              <CardHeader>
                <CardTitle>Match Score</CardTitle>
                <CardDescription>Based on your active resume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">
                    {Math.round(existingMatch.score)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Overall Match
                  </p>
                </div>
                <Progress
                  value={existingMatch.score}
                  className="h-2"
                />
                <Separator />

                {/* Skill Breakdown */}
                {existingMatch.skillMatches && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Skill Breakdown</h4>
                    {(() => {
                      try {
                        const skills =
                          typeof existingMatch.skillMatches === "string"
                            ? JSON.parse(existingMatch.skillMatches)
                            : existingMatch.skillMatches
                        return (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                              <div className="font-semibold text-green-600 dark:text-green-400">
                                {skills.matched?.length || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Matched
                              </div>
                            </div>
                            <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded">
                              <div className="font-semibold text-red-600 dark:text-red-400">
                                {skills.missing?.length || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Missing
                              </div>
                            </div>
                          </div>
                        )
                      } catch {
                        return null
                      }
                    })()}
                  </div>
                )}

                {existingMatch.explanation && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">AI Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      {existingMatch.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function JobDetailSkeleton() {
  return (
    <div className="container py-8">
      <Skeleton className="h-9 w-32 mb-6" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<JobDetailSkeleton />}>
      <JobContent jobId={id} />
    </Suspense>
  )
}
