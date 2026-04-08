import "server-only"

import { findActiveResumeByUserId } from "@/lib/repositories/resume-repository"
import { listTopMatchesByResumeId } from "@/lib/repositories/match-repository"
import { getRecentJobFeed } from "@/lib/domains/jobs/service"

export async function getDashboardSnapshot(userId: string) {
  const resume = await findActiveResumeByUserId(userId)

  const [matches, recentJobs] = await Promise.all([
    resume ? listTopMatchesByResumeId(resume.id, 5) : Promise.resolve([]),
    getRecentJobFeed(5),
  ])

  return {
    resume,
    matches,
    recentJobs,
  }
}
