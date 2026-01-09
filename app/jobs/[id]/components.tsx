"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { calculateJobMatch } from "@/app/actions/match-actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { HoverScale } from "@/components/ui/motion"

interface MatchButtonProps {
  jobId: string
  hasExistingMatch: boolean
}

export function MatchButton({ jobId, hasExistingMatch }: MatchButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleCalculateMatch = () => {
    startTransition(async () => {
      try {
        const result = await calculateJobMatch(jobId)
        if (result.success && result.match) {
          toast.success(`Match score: ${Math.round(result.match.score)}%`)
          router.refresh()
        } else {
          toast.error(result.error || "Failed to calculate match")
        }
      } catch {
        toast.error("Failed to calculate match")
      }
    })
  }

  return (
    <HoverScale>
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          onClick={handleCalculateMatch}
          disabled={isPending}
          variant={hasExistingMatch ? "outline" : "default"}
          className="w-full relative overflow-hidden"
        >
          {isPending ? (
            <>
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
              Calculating...
            </>
          ) : hasExistingMatch ? (
            <>
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
              Recalculate Match
            </>
          ) : (
            <>
              <motion.svg
                whileHover={{ scale: 1.2 }}
                className="mr-2 h-4 w-4"
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
              </motion.svg>
              Calculate Match Score
            </>
          )}
        </Button>
      </motion.div>
    </HoverScale>
  )
}

interface ApplyButtonProps {
  url: string
}

export function ApplyButton({ url }: ApplyButtonProps) {
  return (
    <HoverScale>
      <motion.a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        whileTap={{ scale: 0.95 }}
        className="block"
      >
        <Button className="w-full relative overflow-hidden group">
          <motion.svg
            whileHover={{ x: 3, y: -3 }}
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </motion.svg>
          Apply Now
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.5 }}
          />
        </Button>
      </motion.a>
    </HoverScale>
  )
}
