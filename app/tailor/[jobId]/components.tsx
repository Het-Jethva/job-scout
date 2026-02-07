"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { tailorResumeForJob } from "@/app/actions/tailor-actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { HoverScale, SuccessCheckmark } from "@/components/ui/motion"

interface TailorButtonProps {
  jobId: string
  hasExisting: boolean
}

export function TailorButton({ jobId, hasExisting }: TailorButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showSuccess, setShowSuccess] = useState(false)

  const handleTailor = () => {
    setShowSuccess(false)
    startTransition(async () => {
      try {
        const result = await tailorResumeForJob(jobId)
        if (result.success) {
          setShowSuccess(true)
          toast.success("Resume tailored successfully!")
          setTimeout(() => {
            router.refresh()
            setShowSuccess(false)
          }, 1500)
        } else {
          toast.error(result.error || "Failed to tailor resume")
        }
      } catch {
        toast.error("Failed to tailor resume")
      }
    })
  }

  return (
    <HoverScale>
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          onClick={handleTailor}
          disabled={isPending}
          className="w-full relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center"
              >
                <SuccessCheckmark className="mr-2 h-4 w-4" />
                Done!
              </motion.div>
            ) : isPending ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center"
              >
                <motion.svg
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2 h-4 w-4"
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
                Tailoring Resume...
              </motion.div>
            ) : hasExisting ? (
              <motion.div
                key="retailor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Re-tailor Resume
              </motion.div>
            ) : (
              <motion.div
                key="tailor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center"
              >
                <motion.svg
                  whileHover={{ rotate: 15 }}
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
                </motion.svg>
                Tailor Resume
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </HoverScale>
  )
}

interface CopyButtonProps {
  content: string
  successMessage?: string
}

export function CopyButton({ content, successMessage }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success(successMessage || "Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <HoverScale>
      <motion.div whileTap={{ scale: 0.9 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <SuccessCheckmark className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.svg
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </HoverScale>
  )
}

interface DownloadButtonProps {
  jobId: string
  filename: string
  format?: "pdf" | "latex"
}

export function DownloadButton({
  jobId,
  filename,
  format = "pdf",
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    const encodedJobId = encodeURIComponent(jobId)
    const encodedFileName = encodeURIComponent(filename)
    const endpoint = format === "latex" ? "latex" : "pdf"
    const downloadUrl = `/api/tailor/${encodedJobId}/${endpoint}?filename=${encodedFileName}`
    window.location.assign(downloadUrl)
    toast.success(
      format === "latex"
        ? "Preparing LaTeX download..."
        : "Preparing PDF download..."
    )

    setTimeout(() => setDownloading(false), 1000)
  }

  return (
    <HoverScale>
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
        >
          <AnimatePresence mode="wait">
            {downloading ? (
              <motion.div
                key="downloading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center"
              >
                <SuccessCheckmark className="h-4 w-4 mr-2" />
                {format === "latex" ? "Exported .tex" : "Downloaded"}
              </motion.div>
            ) : (
              <motion.div
                key="download"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center"
              >
                <motion.svg
                  whileHover={{ y: 2 }}
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </motion.svg>
                {format === "latex" ? "Download .tex" : "Download PDF"}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </HoverScale>
  )
}
