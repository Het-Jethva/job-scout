import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import {
  DashboardHeader,
  StatCard,
  ResumeCard,
  MatchesCard,
  RecentJobsCard,
} from "./components"

export const runtime = "nodejs"

async function getDashboardData(userId: string) {
  const [resume, matches, recentJobs] = await Promise.all([
    db.resume.findFirst({
      where: { userId, isActive: true },
      select: {
        id: true,
        fileName: true,
        skills: true,
        createdAt: true,
      },
    }),
    db.match.findMany({
      where: { userId },
      orderBy: { score: "desc" },
      take: 5,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            isRemote: true,
          },
        },
      },
    }),
    db.job.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        isRemote: true,
        publishedAt: true,
      },
    }),
  ])

  type MatchType = (typeof matches)[number]
  type JobType = (typeof recentJobs)[number]

  return {
    resume,
    matches: matches as MatchType[],
    recentJobs: recentJobs as JobType[],
  }
}

export default async function DashboardPage() {
  const session = await requireAuth()
  const { resume, matches, recentJobs } = await getDashboardData(
    session.user.id
  )

  return (
    <div className="container py-8">
      <DashboardHeader userName={session.user.name} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          index={0}
          title="Resume Status"
          value={resume ? "Active" : "Not Uploaded"}
          description={
            resume ? resume.fileName : "Upload your resume to get started"
          }
          icon={
            <svg
              className="h-4 w-4 text-muted-foreground"
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
          }
        />

        <StatCard
          index={1}
          title="Skills Found"
          value={resume?.skills.length || 0}
          description="Extracted from your resume"
          icon={
            <svg
              className="h-4 w-4 text-muted-foreground"
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
          }
        />

        <StatCard
          index={2}
          title="Job Matches"
          value={matches.length}
          description="Jobs analyzed for you"
          icon={
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
        />

        <StatCard
          index={3}
          title="Best Match"
          value={matches[0] ? `${Math.round(matches[0].score)}%` : "N/A"}
          description={matches[0]?.job.title || "Calculate matches to see"}
          icon={
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ResumeCard resume={resume} />
        <MatchesCard
          matches={matches}
          hasResume={!!resume}
        />
        <RecentJobsCard jobs={recentJobs} />
      </div>
    </div>
  )
}
