import { sanitizeText } from "@/lib/utils"

// Unified job listing interface
export interface JobListing {
  externalId: string
  source: "themuse" | "remotive" | "remoteok"
  title: string
  company: string
  companyLogo?: string
  location: string
  jobType?: string
  isRemote: boolean
  salary?: string
  salaryMin?: number
  salaryMax?: number
  description: string
  categories: string[]
  applyUrl: string
  publishedAt: Date
}

// Rate limiting helper
const rateLimiters: Record<string, { lastCall: number; minInterval: number }> =
  {
    themuse: { lastCall: 0, minInterval: 1000 }, // 1 request per second
    remotive: { lastCall: 0, minInterval: 15000 }, // Very limited, be conservative
    remoteok: { lastCall: 0, minInterval: 2000 }, // 1 request per 2 seconds
  }

async function rateLimit(source: string): Promise<void> {
  const limiter = rateLimiters[source]
  if (!limiter) return

  const now = Date.now()
  const timeSinceLastCall = now - limiter.lastCall

  if (timeSinceLastCall < limiter.minInterval) {
    await new Promise((resolve) =>
      setTimeout(resolve, limiter.minInterval - timeSinceLastCall)
    )
  }

  limiter.lastCall = Date.now()
}

/**
 * Fetch jobs from The Muse API
 * Free tier: 500 requests/hour without key, 3600/hour with key
 */
export async function fetchTheMuseJobs(options: {
  page?: number
  category?: string
  level?: string
  location?: string
}): Promise<JobListing[]> {
  await rateLimit("themuse")

  const params = new URLSearchParams({
    page: String(options.page || 1),
    ...(options.category && { category: options.category }),
    ...(options.level && { level: options.level }),
    ...(options.location && { location: options.location }),
  })

  const apiKey = process.env.THEMUSE_API_KEY
  if (apiKey) {
    params.set("api_key", apiKey)
  }

  try {
    const response = await fetch(
      `https://www.themuse.com/api/public/jobs?${params}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    return (data.results || []).map(
      (job: Record<string, unknown>): JobListing => {
        const locations = (job.locations as Array<{ name: string }>) || []
        const categories = (job.categories as Array<{ name: string }>) || []
        const levels = (job.levels as Array<{ name: string }>) || []
        const company = job.company as
          | { name: string; logo?: string }
          | undefined

        return {
          externalId: `themuse_${job.id}`,
          source: "themuse",
          title: sanitizeText((job.name as string) || "Unknown Title"),
          company: sanitizeText(company?.name || "Unknown Company"),
          companyLogo: undefined, // The Muse doesn't provide logos in API
          location: locations.map((l) => l.name).join(", ") || "Various",
          jobType: levels.map((l) => l.name).join(", ") || undefined,
          isRemote: locations.some(
            (l) =>
              l.name.toLowerCase().includes("remote") ||
              l.name.toLowerCase().includes("flexible")
          ),
          description: sanitizeText((job.contents as string) || ""),
          categories: categories.map((c) => c.name),
          applyUrl: (job.refs as { landing_page?: string })?.landing_page || "",
          publishedAt: new Date((job.publication_date as string) || Date.now()),
        }
      }
    )
  } catch (_error) {
    return []
  }
}

/**
 * Fetch jobs from Remotive API
 * Free tier: Limited requests, includes remote jobs only
 */
export async function fetchRemotiveJobs(options: {
  category?: string
  search?: string
  limit?: number
}): Promise<JobListing[]> {
  await rateLimit("remotive")

  const params = new URLSearchParams()
  if (options.category) params.set("category", options.category)
  if (options.search) params.set("search", options.search)
  if (options.limit) params.set("limit", String(options.limit))

  try {
    const response = await fetch(
      `https://remotive.com/api/remote-jobs?${params}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    return (data.jobs || []).map((job: Record<string, unknown>): JobListing => {
      return {
        externalId: `remotive_${job.id}`,
        source: "remotive",
        title: sanitizeText((job.title as string) || "Unknown Title"),
        company: sanitizeText(
          (job.company_name as string) || "Unknown Company"
        ),
        companyLogo: (job.company_logo as string) || undefined,
        location: (job.candidate_required_location as string) || "Worldwide",
        jobType: (job.job_type as string) || undefined,
        isRemote: true, // All Remotive jobs are remote
        salary: (job.salary as string) || undefined,
        description: sanitizeText((job.description as string) || ""),
        categories: [(job.category as string) || "Other"],
        applyUrl: (job.url as string) || "",
        publishedAt: new Date((job.publication_date as string) || Date.now()),
      }
    })
  } catch (_error) {
    return []
  }
}

/**
 * Fetch jobs from RemoteOK API
 * Free tier: No auth required, returns JSON array
 */
export async function fetchRemoteOKJobs(): Promise<JobListing[]> {
  await rateLimit("remoteok")

  try {
    const response = await fetch("https://remoteok.com/api", {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobScout/1.0",
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    // First item is often metadata/legal notice, skip it
    const jobs = Array.isArray(data) ? data.slice(1) : []

    return jobs
      .filter((job: Record<string, unknown>) => job.id && job.position)
      .map((job: Record<string, unknown>): JobListing => {
        // Parse salary range if available
        let salaryMin: number | undefined
        let salaryMax: number | undefined
        const salary = job.salary as string | undefined

        if (salary) {
          const salaryMatch = salary.match(/(\d+)k?\s*-\s*(\d+)k?/i)
          if (salaryMatch) {
            salaryMin = parseInt(salaryMatch[1]) * 1000
            salaryMax = parseInt(salaryMatch[2]) * 1000
          }
        }

        return {
          externalId: `remoteok_${job.id}`,
          source: "remoteok",
          title: sanitizeText((job.position as string) || "Unknown Title"),
          company: sanitizeText((job.company as string) || "Unknown Company"),
          companyLogo:
            (job.company_logo as string) || (job.logo as string) || undefined,
          location: (job.location as string) || "Remote",
          jobType: "Full-time", // RemoteOK mostly has full-time
          isRemote: true,
          salary: salary,
          salaryMin,
          salaryMax,
          description: sanitizeText((job.description as string) || ""),
          categories: ((job.tags as string[]) || []).slice(0, 5),
          applyUrl: (job.url as string) || `https://remoteok.com/l/${job.slug}`,
          publishedAt: new Date(
            (job.date as string) || (job.epoch as number) * 1000 || Date.now()
          ),
        }
      })
  } catch (_error) {
    return []
  }
}

/**
 * Fetch jobs from all sources and deduplicate
 */
export async function fetchAllJobs(options?: {
  category?: string
  search?: string
}): Promise<JobListing[]> {
  const [museJobs, remotiveJobs, remoteOkJobs] = await Promise.allSettled([
    fetchTheMuseJobs({
      category: options?.category,
    }),
    fetchRemotiveJobs({
      category: options?.category,
      search: options?.search,
    }),
    fetchRemoteOKJobs(),
  ])

  const allJobs: JobListing[] = []

  if (museJobs.status === "fulfilled") {
    allJobs.push(...museJobs.value)
  }
  if (remotiveJobs.status === "fulfilled") {
    allJobs.push(...remotiveJobs.value)
  }
  if (remoteOkJobs.status === "fulfilled") {
    allJobs.push(...remoteOkJobs.value)
  }

  // Deduplicate by title + company
  const seen = new Set<string>()
  const uniqueJobs = allJobs.filter((job) => {
    const key = `${job.title.toLowerCase()}_${job.company.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by published date
  return uniqueJobs.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  )
}

// Job categories mapping for different APIs
export const JOB_CATEGORIES = {
  software: {
    themuse: "Engineering",
    remotive: "software-dev",
    label: "Software Development",
  },
  data: {
    themuse: "Data Science",
    remotive: "data",
    label: "Data & Analytics",
  },
  design: {
    themuse: "Design",
    remotive: "design",
    label: "Design",
  },
  product: {
    themuse: "Product",
    remotive: "product",
    label: "Product Management",
  },
  marketing: {
    themuse: "Marketing & PR",
    remotive: "marketing",
    label: "Marketing",
  },
  sales: {
    themuse: "Sales",
    remotive: "sales",
    label: "Sales",
  },
  devops: {
    themuse: "Engineering",
    remotive: "devops",
    label: "DevOps & SysAdmin",
  },
  hr: {
    themuse: "HR & Recruiting",
    remotive: "hr",
    label: "HR & Recruiting",
  },
} as const
