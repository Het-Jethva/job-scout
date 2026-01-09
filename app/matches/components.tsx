"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { calculateBatchMatches } from "@/app/actions/match-actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  HoverScale,
  AnimatedProgress,
  SuccessCheckmark,
} from "@/components/ui/motion"

export function BatchMatchButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [progress, setProgress] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleBatchMatch = () => {
    setProgress(0)
    setShowSuccess(false)
    startTransition(async () => {
      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90))
        }, 500)

        const result = await calculateBatchMatches(20)

        clearInterval(progressInterval)
        setProgress(100)
        setShowSuccess(true)

        // result is an array of match results
        const successCount = result.filter((r) => r.success).length
        toast.success(`Calculated ${successCount} matches!`)
        router.refresh()
      } catch {
        toast.error("Failed to calculate matches")
      } finally {
        setTimeout(() => {
          setProgress(0)
          setShowSuccess(false)
        }, 2000)
      }
    })
  }

  return (
    <div className="space-y-2">
      <HoverScale>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleBatchMatch}
            disabled={isPending}
            className="relative overflow-hidden"
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
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
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
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center"
                >
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
                  Find Best Matches
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </HoverScale>
      <AnimatePresence>
        {isPending && progress > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AnimatedProgress
              value={progress}
              className="h-1 w-32"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
