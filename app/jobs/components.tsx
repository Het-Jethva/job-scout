"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { syncJobs } from "@/app/actions/job-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { FadeIn, HoverScale } from "@/components/ui/motion"

const CATEGORIES = [
  "Software Engineering",
  "Data Science",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Customer Support",
  "Operations",
  "Finance",
  "Human Resources",
]

export function JobFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete("page") // Reset to page 1 on filter change
    router.push(`/jobs?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters("search", search || null)
  }

  return (
    <FadeIn
      delay={0.1}
      className="mb-6 space-y-4"
    >
      <form
        onSubmit={handleSearch}
        className="flex gap-2"
      >
        <motion.div
          whileFocus={{ scale: 1.01 }}
          className="flex-1 max-w-sm"
        >
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.div>
        <HoverScale>
          <Button
            type="submit"
            variant="secondary"
          >
            Search
          </Button>
        </HoverScale>
        <AnimatePresence>
          {searchParams.toString() && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/jobs")}
              >
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="flex items-center gap-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={searchParams.get("category") || ""}
            onValueChange={(value) =>
              updateFilters("category", value === "all" ? null : value)
            }
          >
            <SelectTrigger
              id="category"
              className="w-45"
            >
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem
                  key={cat}
                  value={cat}
                >
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Switch
            id="remote"
            checked={searchParams.get("remote") === "true"}
            onCheckedChange={(checked) =>
              updateFilters("remote", checked ? "true" : null)
            }
          />
          <Label htmlFor="remote">Remote Only</Label>
        </motion.div>
      </motion.div>
    </FadeIn>
  )
}

export function SyncJobsButton() {
  const [isPending, startTransition] = useTransition()

  const handleSync = () => {
    startTransition(async () => {
      try {
        const result = await syncJobs()
        if (result.success) {
          toast.success(
            `Synced ${result.added} new jobs (${result.updated} updated)`
          )
        } else {
          toast.error(result.error || "Failed to sync jobs")
        }
      } catch {
        toast.error("Failed to sync jobs")
      }
    })
  }

  return (
    <HoverScale>
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          onClick={handleSync}
          disabled={isPending}
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
              Syncing...
            </>
          ) : (
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
              Sync Jobs
            </>
          )}
        </Button>
      </motion.div>
    </HoverScale>
  )
}

export function CompanyLogo({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <motion.img
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={(event) => {
        event.currentTarget.onerror = null
        event.currentTarget.src = "/logo-fallback.svg"
      }}
    />
  )
}
