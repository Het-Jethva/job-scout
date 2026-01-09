import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { getUserResumes, getActiveResume } from "@/app/actions/resume-actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Markdown } from "@/components/ui/markdown"
import { ResumeUploader, ResumeList, ResumePageSkeleton } from "./components"

async function ResumeContent() {
  await requireAuth()

  const [resumes, activeResume] = await Promise.all([
    getUserResumes(),
    getActiveResume(),
  ])

  const parsedData = activeResume?.parsedData as {
    skills?: Array<{ name: string; category: string; level?: string }>
    experience?: Array<{
      title: string
      company: string
      duration: string
      responsibilities: string[]
    }>
    education?: Array<{
      degree: string
      institution: string
      year: string
      field: string
    }>
    summary?: string
    yearsOfExperience?: number
  } | null

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
          <CardDescription>
            Upload your resume to extract skills and match with jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUploader />
        </CardContent>
      </Card>

      {/* Active Resume Analysis */}
      {activeResume && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Resume Analysis</CardTitle>
            <CardDescription>
              AI-extracted information from your active resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="skills"
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent
                value="skills"
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Technical Skills */}
                  <div>
                    <h4 className="font-medium mb-2">Technical Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills
                        ?.filter(
                          (s) =>
                            s.category === "technical" ||
                            s.category === "tool" ||
                            s.category === "framework"
                        )
                        .map((skill) => (
                          <Badge
                            key={skill.name}
                            variant="default"
                            className="text-sm"
                          >
                            {skill.name}
                            {skill.level && (
                              <span className="ml-1 opacity-70">
                                ({skill.level})
                              </span>
                            )}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  {/* Other Skills */}
                  <div>
                    <h4 className="font-medium mb-2">Other Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills
                        ?.filter(
                          (s) =>
                            s.category !== "technical" &&
                            s.category !== "tool" &&
                            s.category !== "framework"
                        )
                        .map((skill) => (
                          <Badge
                            key={skill.name}
                            variant="secondary"
                            className="text-sm"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="experience"
                className="space-y-4"
              >
                {parsedData.experience?.map((exp, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{exp.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {exp.company}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {exp.duration}
                      </span>
                    </div>
                    {exp.responsibilities?.length > 0 && (
                      <ul className="mt-2 text-sm space-y-1">
                        {exp.responsibilities.slice(0, 3).map((resp, j) => (
                          <li
                            key={j}
                            className="text-muted-foreground"
                          >
                            • {resp}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {(!parsedData.experience ||
                  parsedData.experience.length === 0) && (
                  <p className="text-muted-foreground">
                    No experience data extracted
                  </p>
                )}
              </TabsContent>

              <TabsContent
                value="education"
                className="space-y-4"
              >
                {parsedData.education?.map((edu, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border"
                  >
                    <h4 className="font-medium">{edu.degree}</h4>
                    <p className="text-sm text-muted-foreground">
                      {edu.institution}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {edu.field} • {edu.year}
                    </p>
                  </div>
                ))}
                {(!parsedData.education ||
                  parsedData.education.length === 0) && (
                  <p className="text-muted-foreground">
                    No education data extracted
                  </p>
                )}
              </TabsContent>

              <TabsContent
                value="summary"
                className="space-y-4"
              >
                <div className="p-4 rounded-lg border">
                  {parsedData.summary ? (
                    <Markdown>{parsedData.summary}</Markdown>
                  ) : (
                    <p className="text-muted-foreground">
                      No summary available
                    </p>
                  )}
                  {parsedData.yearsOfExperience && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Estimated experience: {parsedData.yearsOfExperience} years
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Resume History */}
      <Card>
        <CardHeader>
          <CardTitle>Resume History</CardTitle>
          <CardDescription>Manage your uploaded resumes</CardDescription>
        </CardHeader>
        <CardContent>
          {resumes.length > 0 ? (
            <ResumeList resumes={resumes} />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No resumes uploaded yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResumePage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Resume</h1>
        <p className="text-muted-foreground">
          Upload and manage your resumes for job matching
        </p>
      </div>

      <Suspense fallback={<ResumePageSkeleton />}>
        <ResumeContent />
      </Suspense>
    </div>
  )
}
