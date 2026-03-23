import { findRecentJobs } from "@/lib/domains/job/repository"
import { findMatchesByUserId } from "@/lib/domains/match/repository"
import { findActiveResumeSummaryByUserId } from "@/lib/domains/resume/repository"

export async function getDashboardData(userId: string) {
  const [resume, matches, recentJobs] = await Promise.all([
    findActiveResumeSummaryByUserId(userId),
    findMatchesByUserId({
      userId,
      limit: 5,
      minScore: 0,
    }),
    findRecentJobs(5),
  ])

  return {
    resume,
    matches,
    recentJobs,
  }
}
