"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  NumberTicker,
} from "@/components/ui/motion"

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
  index: number
}

export function StatCard({
  title,
  value,
  description,
  icon,
  index,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <HoverLift>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
            >
              {icon}
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div
              className="text-2xl font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              {typeof value === "number" ? (
                <NumberTicker value={value} />
              ) : (
                value
              )}
            </motion.div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      </HoverLift>
    </motion.div>
  )
}

interface ResumeCardProps {
  resume: {
    id: string
    fileName: string
    skills: string[]
    createdAt: Date
  } | null
}

export function ResumeCard({ resume }: ResumeCardProps) {
  return (
    <FadeIn delay={0.4}>
      <HoverLift>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Your Resume</CardTitle>
            <CardDescription>
              {resume
                ? "Your resume is ready for matching"
                : "Upload a resume to start matching with jobs"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resume ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{resume.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {resume.skills.length} skills extracted
                    </p>
                  </div>
                  <Link href="/resume">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        Manage
                      </Button>
                    </motion.div>
                  </Link>
                </div>
                <StaggerContainer className="flex flex-wrap gap-2">
                  {resume.skills.slice(0, 8).map((skill: string) => (
                    <StaggerItem key={skill}>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Badge variant="secondary">{skill}</Badge>
                      </motion.div>
                    </StaggerItem>
                  ))}
                  {resume.skills.length > 8 && (
                    <StaggerItem>
                      <Badge variant="outline">
                        +{resume.skills.length - 8} more
                      </Badge>
                    </StaggerItem>
                  )}
                </StaggerContainer>
              </div>
            ) : (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.svg
                  className="mx-auto h-12 w-12 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ y: -10 }}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </motion.svg>
                <p className="mt-4 text-sm text-muted-foreground">
                  No resume uploaded yet
                </p>
                <Link href="/resume">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Button className="mt-4">Upload Resume</Button>
                  </motion.div>
                </Link>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </HoverLift>
    </FadeIn>
  )
}

interface MatchesCardProps {
  matches: {
    id: string
    score: number
    job: {
      id: string
      title: string
      company: string
      location: string
      isRemote: boolean
    }
  }[]
  hasResume: boolean
}

export function MatchesCard({ matches, hasResume }: MatchesCardProps) {
  return (
    <FadeIn delay={0.5}>
      <HoverLift>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Top Matches</CardTitle>
            <CardDescription>Jobs that best match your profile</CardDescription>
          </CardHeader>
          <CardContent>
            {matches.length > 0 ? (
              <div className="space-y-4">
                {matches.map((match, index) => (
                  <motion.div
                    key={match.id}
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/jobs/${match.job.id}`}
                        className="font-medium hover:underline"
                      >
                        {match.job.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {match.job.company}
                        {match.job.isRemote && " • Remote"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "4rem" }}
                        transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                      >
                        <Progress
                          value={match.score}
                          className="w-16 h-2"
                        />
                      </motion.div>
                      <span className="text-sm font-medium w-10">
                        {Math.round(match.score)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
                <Link href="/matches">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                    >
                      View All Matches
                    </Button>
                  </motion.div>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {hasResume
                    ? "No matches calculated yet"
                    : "Upload a resume to see matches"}
                </p>
                {hasResume && (
                  <Link href="/jobs">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-block"
                    >
                      <Button className="mt-4">Browse Jobs</Button>
                    </motion.div>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </HoverLift>
    </FadeIn>
  )
}

interface RecentJobsCardProps {
  jobs: {
    id: string
    title: string
    company: string
    location: string
    isRemote: boolean
    publishedAt: Date | null
  }[]
}

export function RecentJobsCard({ jobs }: RecentJobsCardProps) {
  return (
    <FadeIn delay={0.6}>
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Jobs</CardTitle>
              <CardDescription>
                Latest job listings from our sources
              </CardDescription>
            </div>
            <Link href="/jobs">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                >
                  View All
                </Button>
              </motion.div>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length > 0 ? (
            <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <StaggerItem key={job.id}>
                  <Link href={`/jobs/${job.id}`}>
                    <motion.div
                      className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <h4 className="font-medium line-clamp-1">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {job.company}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {job.location}
                        </span>
                        {job.isRemote && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            Remote
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No jobs available yet. Jobs will be synced from our sources.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  )
}

interface DashboardHeaderProps {
  userName: string | null
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <motion.div
      className="flex items-center justify-between mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <motion.h1
          className="text-3xl font-bold tracking-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Dashboard
        </motion.h1>
        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Welcome back, {userName || "there"}!
        </motion.p>
      </div>
    </motion.div>
  )
}
