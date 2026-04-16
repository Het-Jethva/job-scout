import { Suspense } from "react"
import Link from "next/link"
import { requireAuth } from "@/lib/auth-utils"
import {
  getActiveResume as getActiveResumeForUser,
} from "@/lib/domains/resume/service"
import { getMatchesForActiveResume } from "@/lib/domains/matching/service"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { BatchMatchButton } from "./components"

async function MatchesContent() {
  const session = await requireAuth()
  const activeResume = await getActiveResumeForUser(session.user.id)

  if (!activeResume) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium">No active resume</h3>
        <p className="mt-2 text-muted-foreground">
          Upload and set an active resume to start matching with jobs.
        </p>
        <Link
          href="/resume"
          className="mt-4 inline-block"
        >
          <Button>Upload Resume</Button>
        </Link>
      </div>
    )
  }

  const matches = await getMatchesForActiveResume({
    userId: session.user.id,
    limit: 50,
  })

  if (matches.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Resume</CardTitle>
            <CardDescription>{activeResume.fileName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <BatchMatchButton />
              <Link href="/jobs">
                <Button variant="outline">Browse Jobs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium">No matches yet</h3>
          <p className="mt-2 text-muted-foreground">
            Calculate matches with jobs to see your compatibility scores.
          </p>
        </div>
      </div>
    )
  }

  // Group matches by score ranges
  type MatchWithJob = (typeof matches)[number]
  const excellentMatches = matches.filter((m: MatchWithJob) => m.score >= 80)
  const goodMatches = matches.filter(
    (m: MatchWithJob) => m.score >= 60 && m.score < 80
  )
  // fairMatches could be used for future "Needs Work" section
  void matches.filter((m: MatchWithJob) => m.score < 60)

  return (
    <div className="space-y-6">
      {/* Active Resume Card */}
      <Card>
        <CardHeader>
          <CardTitle>Active Resume</CardTitle>
          <CardDescription>{activeResume.fileName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <BatchMatchButton />
            <Link href="/jobs">
              <Button variant="outline">Browse Jobs</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Excellent Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {excellentMatches.length}
            </div>
            <p className="text-xs text-muted-foreground">80%+ match score</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Good Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {goodMatches.length}
            </div>
            <p className="text-xs text-muted-foreground">60-79% match score</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matches.length}</div>
            <p className="text-xs text-muted-foreground">Jobs analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* Match List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Matches</h2>
        <div className="space-y-3">
          {matches.map((match: MatchWithJob) => (
            <Card
              key={match.id}
              className="overflow-hidden"
            >
              <div className="flex items-center">
                {/* Score Indicator */}
                <div
                  className={`w-1.5 h-full min-h-25 ${
                    match.score >= 80
                      ? "bg-green-500"
                      : match.score >= 60
                      ? "bg-blue-500"
                      : "bg-yellow-500"
                  }`}
                />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/jobs/${match.job.id}`}
                          className="font-semibold hover:text-primary line-clamp-1"
                        >
                          {match.job.title}
                        </Link>
                        {match.job.isRemote && (
                          <Badge
                            variant="default"
                            className="text-xs shrink-0"
                          >
                            Remote
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {match.job.company} • {match.job.location}
                      </p>

                      {/* Skill breakdown */}
                      {match.skillMatches && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(() => {
                            try {
                              const skills =
                               typeof match.skillMatches === "string"
                                  ? JSON.parse(match.skillMatches)
                                  : match.skillMatches
                               return (
                                 <>
                                   {skills.matched
                                     ?.slice(0, 3)
                                     .map((skill: string) => (
                                       <Badge
                                        key={skill}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        ✓ {skill}
                                      </Badge>
                                    ))}
                                   {skills.missing
                                     ?.slice(0, 2)
                                     .map((skill: string) => (
                                       <Badge
                                        key={skill}
                                        variant="outline"
                                        className="text-xs text-muted-foreground"
                                      >
                                        ✗ {skill}
                                      </Badge>
                                    ))}
                                </>
                              )
                            } catch {
                              return null
                            }
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold">
                        {Math.round(match.score)}%
                      </div>
                      <Progress
                        value={match.score}
                        className="w-20 h-2 mt-1"
                      />
                      <div className="flex gap-2 mt-3">
                        <Link href={`/jobs/${match.job.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                          >
                            View
                          </Button>
                        </Link>
                        <Link href={`/tailor/${match.job.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            Tailor
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function MatchesSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-1" />
                </div>
                <Skeleton className="h-12 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function MatchesPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Job Matches</h1>
        <p className="text-muted-foreground">
          View your compatibility scores with jobs based on your resume
        </p>
      </div>

      <Suspense fallback={<MatchesSkeleton />}>
        <MatchesContent />
      </Suspense>
    </div>
  )
}
