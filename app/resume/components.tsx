"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useUploadThing } from "@/lib/uploadthing"
import { processResumeUpload } from "@/app/actions/resume-actions"
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  HoverScale,
  SuccessCheckmark,
  LoadingDots,
  AnimatedProgress,
} from "@/components/ui/motion"

const formatResumeDate = (value: string | Date) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))

interface ResumeUploaderProps {
  onUploadComplete?: () => void
}

export function ResumeUploader({ onUploadComplete }: ResumeUploaderProps) {
  const router = useRouter()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const { startUpload, isUploading } = useUploadThing("resumeUploader", {
    onUploadProgress: (progress) => {
      setUploadProgress(progress)
    },
    onClientUploadComplete: async (res) => {
      if (!res || res.length === 0) {
        toast.error("Upload failed - no response received")
        return
      }

      const uploadedFile = res[0]
      const fileUrl = uploadedFile.ufsUrl || uploadedFile.url

      if (!fileUrl) {
        toast.error("Upload succeeded but no file URL was returned.")
        setUploadProgress(0)
        return
      }
      setProcessing(true)

      try {
        toast.info("Processing your resume with AI...")

        const result = await processResumeUpload(
          fileUrl,
          uploadedFile.name,
          uploadedFile.type,
          uploadedFile.size
        )

        if (result.success) {
          setSuccess(true)
          toast.success("Resume uploaded and processed successfully!")
          setTimeout(() => {
            router.refresh()
            onUploadComplete?.()
            setSuccess(false)
          }, 1500)
        } else {
          toast.error(result.error || "Failed to process resume")
        }
      } catch (_error) {
        toast.error("Failed to process resume. Please try again.")
      } finally {
        setProcessing(false)
        setUploadProgress(0)
      }
    },
    onUploadError: (error) => {
      toast.error(error.message || "Failed to upload resume. Please try again.")
      setUploadProgress(0)
    },
  })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Validate file type
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ]
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload PDF, DOCX, or TXT.")
        return
      }

      // Validate file size (4MB max)
      if (file.size > 4 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 4MB.")
        return
      }

      await startUpload([file])
    },
    [startUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: isUploading || processing,
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-all duration-200
        ${
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-primary/50"
        }
        ${isUploading || processing ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="space-y-4 py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <SuccessCheckmark className="h-8 w-8" />
            </motion.div>
            <p className="font-medium text-green-600 dark:text-green-400">
              Upload Complete!
            </p>
          </motion.div>
        ) : isUploading ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <motion.svg
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="mx-auto h-12 w-12 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </motion.svg>
            <div>
              <p className="font-medium">Uploading...</p>
              <AnimatedProgress
                value={uploadProgress}
                className="mt-2 w-48 mx-auto"
              />
            </div>
          </motion.div>
        ) : processing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <motion.svg
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mx-auto h-12 w-12 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </motion.svg>
            <div>
              <p className="font-medium">Processing with AI...</p>
              <p className="text-sm text-muted-foreground">
                Extracting skills and generating embeddings
              </p>
              <LoadingDots className="mt-3 justify-center" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.svg
              animate={
                isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }
              }
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </motion.svg>
            <div className="mt-4">
              <p className="font-medium">
                {isDragActive
                  ? "Drop your resume here"
                  : "Drag & drop your resume here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Supported formats: PDF, DOCX, TXT (Max 4MB)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ResumeListProps {
  resumes: Array<{
    id: string
    fileName: string
    fileUrl: string
    fileType: string
    skills: string[]
    isActive: boolean
    createdAt: Date
  }>
}

export function ResumeList({ resumes }: ResumeListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSetActive = async (resumeId: string) => {
    setLoading(resumeId)
    try {
      const { setActiveResume } = await import("@/app/actions/resume-actions")
      await setActiveResume(resumeId)
      toast.success("Resume set as active")
      router.refresh()
    } catch {
      toast.error("Failed to set resume as active")
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (resumeId: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return

    setLoading(resumeId)
    try {
      const { deleteResume } = await import("@/app/actions/resume-actions")
      await deleteResume(resumeId)
      toast.success("Resume deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete resume")
    } finally {
      setLoading(null)
    }
  }

  if (resumes.length === 0) {
    return null
  }

  return (
    <StaggerContainer className="space-y-4">
      <AnimatePresence>
        {resumes.map((resume, index) => (
          <StaggerItem key={resume.id}>
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className={`flex items-start justify-between p-4 rounded-lg border transition-colors ${
                resume.isActive
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/30"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{resume.fileName}</span>
                  <AnimatePresence>
                    {resume.isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <Badge
                          variant="default"
                          className="text-xs"
                        >
                          Active
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className="text-sm text-muted-foreground">
                  {resume.skills.length} skills •{" "}
                  {formatResumeDate(resume.createdAt)}
                </p>
                <div className="flex flex-wrap gap-1">
                  {resume.skills.slice(0, 5).map((skill, i) => (
                    <motion.div
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Badge
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    </motion.div>
                  ))}
                  {resume.skills.length > 5 && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                    >
                      +{resume.skills.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!resume.isActive && (
                  <HoverScale>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetActive(resume.id)}
                      disabled={loading === resume.id}
                    >
                      {loading === resume.id ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          ⟳
                        </motion.span>
                      ) : (
                        "Set Active"
                      )}
                    </Button>
                  </HoverScale>
                )}
                <HoverScale>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(resume.id)}
                    disabled={loading === resume.id}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </HoverScale>
              </div>
            </motion.div>
          </StaggerItem>
        ))}
      </AnimatePresence>
    </StaggerContainer>
  )
}

export function ResumePageSkeleton() {
  return (
    <FadeIn className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </FadeIn>
  )
}
