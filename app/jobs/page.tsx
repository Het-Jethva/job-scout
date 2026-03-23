import { Suspense } from "react"
import Link from "next/link"
import { listJobs } from "@/lib/domains/job/repository"
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
import { JobFilters, SyncJobsButton, CompanyLogo } from "./components"

interface JobsPageProps {
  searchParams: Promise<{
    page?: string
    category?: string
    remote?: string
    search?: string
  }>
}

async function JobsList({
  searchParams,
}: {
  searchParams: JobsPageProps["searchParams"]
}) {
  const params = await searchParams
  const page = parseInt(params.page || "1")
  const category = params.category
  const isRemote = params.remote === "true" ? true : undefined
  const search = params.search

  const { jobs, pagination } = await listJobs({
    page,
    limit: 20,
    category,
    isRemote,
    search,
  })

  type JobType = (typeof jobs)[number]

  if (jobs.length === 0) {
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
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium">No jobs found</h3>
        <p className="mt-2 text-muted-foreground">
          Try adjusting your filters or sync new jobs from our sources.
        </p>
        <SyncJobsButton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job: JobType) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
          >
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="line-clamp-2 text-lg">
                      {job.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {job.company}
                    </CardDescription>
                  </div>
                  {job.companyLogo && (
                    <div className="relative w-10 h-10 shrink-0">
                      <CompanyLogo
                        src={job.companyLogo}
                        alt={job.company}
                        className="w-10 h-10 rounded object-contain"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  {job.isRemote && (
                    <Badge
                      variant="default"
                      className="text-xs"
                    >
                      Remote
                    </Badge>
                  )}
                  {job.jobType && (
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {job.jobType}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs"
                  >
                    {job.source}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="line-clamp-1">{job.location}</span>
                  {job.salary && (
                    <span className="font-medium text-foreground">
                      {job.salary}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Posted{" "}
                  {new Date(job.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={{
                pathname: "/jobs",
                query: {
                  ...params,
                  page: page - 1,
                },
              }}
            >
              <Button
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          {page < pagination.totalPages && (
            <Link
              href={{
                pathname: "/jobs",
                query: {
                  ...params,
                  page: page + 1,
                },
              }}
            >
              <Button
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function JobsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function JobFiltersSkeleton() {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 max-w-sm flex-1" />
        <Skeleton className="h-10 w-20" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  )
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Listings</h1>
          <p className="text-muted-foreground">
            Browse jobs from multiple sources and find your match
          </p>
        </div>
        <SyncJobsButton />
      </div>

      <Suspense fallback={<JobFiltersSkeleton />}>
        <JobFilters />
      </Suspense>

      <Suspense fallback={<JobsListSkeleton />}>
        <JobsList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
