import { sanitizeText } from "@/lib/utils"

// Unified job listing interface
export type JobSource =
  | "themuse"
  | "remotive"
  | "remoteok"
  | "arbeitnow"
  | "himalayas"
  | "jobicy"

export interface JobListing {
  externalId: string
  source: JobSource
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
  arbeitnow: { lastCall: 0, minInterval: 1000 },
  himalayas: { lastCall: 0, minInterval: 1200 },
  jobicy: { lastCall: 0, minInterval: 2000 },
}

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&#39;": "'",
  "&nbsp;": " ",
}

function decodeHtmlEntities(value: string): string {
  if (!value) return ""

  return value.replace(
    /&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|#39|nbsp);/g,
    (match, entity) => {
      if (HTML_ENTITY_MAP[match]) return HTML_ENTITY_MAP[match]

      if (entity.startsWith("#x")) {
        const code = parseInt(entity.slice(2), 16)
        return Number.isFinite(code) ? String.fromCharCode(code) : match
      }

      if (entity.startsWith("#")) {
        const code = parseInt(entity.slice(1), 10)
        return Number.isFinite(code) ? String.fromCharCode(code) : match
      }

      return match
    }
  )
}

function decodeHtmlEntitiesDeep(value: string, passes = 2): string {
  let decoded = value
  for (let i = 0; i < passes; i += 1) {
    const next = decodeHtmlEntities(decoded)
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

function compactUnique(values: Array<string | null | undefined>): string[] {
  const deduped = new Map<string, string>()

  for (const raw of values) {
    const trimmed = (raw || "").trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (!deduped.has(key)) {
      deduped.set(key, trimmed)
    }
  }

  return [...deduped.values()]
}

function appendCategoryLabels(
  categories: string[],
  source: JobSource
): string[] {
  if (categories.length === 0) {
    return categories
  }

  if (source !== "themuse" && source !== "remotive") {
    return compactUnique(categories)
  }

  const normalized = categories.map((category) => category.toLowerCase())
  const labels: string[] = []

  for (const entry of Object.values(JOB_CATEGORIES)) {
    const candidate =
      source === "themuse" ? entry.themuse : entry.remotive
    if (normalized.includes(candidate.toLowerCase())) {
      labels.push(entry.label)
    }
  }

  return compactUnique([...categories, ...labels])
}

function normalizeSalaryRange(input: {
  min?: number | null
  max?: number | null
  currency?: string | null
  period?: string | null
}): { salary?: string; salaryMin?: number; salaryMax?: number } {
  const min =
    typeof input.min === "number" && Number.isFinite(input.min)
      ? Math.round(input.min)
      : undefined
  const max =
    typeof input.max === "number" && Number.isFinite(input.max)
      ? Math.round(input.max)
      : undefined

  if (!min && !max) {
    return { salary: undefined, salaryMin: undefined, salaryMax: undefined }
  }

  const currency = (input.currency || "").trim().toUpperCase()
  const currencyLabel = currency ? `${currency} ` : ""
  const periodLabel = (input.period || "").trim()
  const suffix = periodLabel ? `/${periodLabel}` : ""

  const salaryText = min && max
    ? `${currencyLabel}${min}-${max}${suffix}`
    : min
      ? `${currencyLabel}${min}+${suffix}`
      : `${currencyLabel}${max}${suffix}`

  return {
    salary: salaryText.trim(),
    salaryMin: min,
    salaryMax: max,
  }
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
          categories: appendCategoryLabels(
            categories.map((c) => c.name),
            "themuse"
          ),
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
        // Remotive blocks cross-origin image requests (CORP header), so skip their logos
        companyLogo: undefined,
        location: (job.candidate_required_location as string) || "Worldwide",
        jobType: (job.job_type as string) || undefined,
        isRemote: true, // All Remotive jobs are remote
        salary: (job.salary as string) || undefined,
        description: sanitizeText((job.description as string) || ""),
        categories: appendCategoryLabels(
          [(job.category as string) || "Other"],
          "remotive"
        ),
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
 * Fetch jobs from Arbeitnow API (global, includes remote flag)
 * Free, no auth. 100 results per page.
 */
export async function fetchArbeitnowJobs(options?: {
  page?: number
  search?: string
}): Promise<JobListing[]> {
  await rateLimit("arbeitnow")

  const params = new URLSearchParams({
    page: String(options?.page || 1),
  })
  if (options?.search) {
    params.set("search", options.search)
  }

  try {
    const response = await fetch(
      `https://www.arbeitnow.com/api/job-board-api?${params}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const jobs = Array.isArray(data.data) ? data.data : []

    return jobs.map((job: Record<string, unknown>): JobListing => {
      const title = sanitizeText(
        decodeHtmlEntitiesDeep((job.title as string) || "Unknown Title")
      )
      const company = sanitizeText(
        decodeHtmlEntitiesDeep((job.company_name as string) || "Unknown Company")
      )
      const description = sanitizeText(
        decodeHtmlEntitiesDeep((job.description as string) || "")
      )
      const location = sanitizeText((job.location as string) || "Various")
      const isRemote = Boolean(job.remote) || /remote/i.test(location)
      const jobTypes = (job.job_types as string[]) || []
      const tags = (job.tags as string[]) || []
      const createdAt = typeof job.created_at === "number" ? job.created_at : null

      return {
        externalId: `arbeitnow_${job.slug || job.url || title}`,
        source: "arbeitnow",
        title,
        company,
        companyLogo: undefined,
        location,
        jobType: jobTypes.length > 0 ? jobTypes.join(", ") : undefined,
        isRemote,
        description,
        categories: compactUnique([...tags, ...jobTypes]),
        applyUrl: (job.url as string) || "",
        publishedAt: new Date(
          createdAt ? createdAt * 1000 : Date.now()
        ),
      }
    })
  } catch (_error) {
    return []
  }
}

/**
 * Fetch jobs from Himalayas API (remote-focused)
 * Free, no auth.
 */
export async function fetchHimalayasJobs(options?: {
  limit?: number
  offset?: number
}): Promise<JobListing[]> {
  await rateLimit("himalayas")

  const params = new URLSearchParams({
    limit: String(options?.limit || 50),
    offset: String(options?.offset || 0),
  })

  try {
    const response = await fetch(
      `https://himalayas.app/jobs/api?${params}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const jobs = Array.isArray(data.jobs) ? data.jobs : []

    return jobs.map((job: Record<string, unknown>): JobListing => {
      const title = sanitizeText((job.title as string) || "Unknown Title")
      const company = sanitizeText((job.companyName as string) || "Unknown Company")
      const description = sanitizeText((job.description as string) || "")
      const locationRestrictions = (job.locationRestrictions as string[]) || []
      const location =
        locationRestrictions.length > 0
          ? locationRestrictions.join(", ")
          : "Worldwide"

      const categories = compactUnique([
        ...(job.categories as string[] | undefined) || [],
        ...(job.parentCategories as string[] | undefined) || [],
        (job.employmentType as string | undefined) || "",
      ])

      const publishedAt =
        typeof job.pubDate === "number"
          ? new Date(job.pubDate * 1000)
          : new Date((job.pubDate as string) || Date.now())

      return {
        externalId: `himalayas_${job.guid || job.applicationLink || title}`,
        source: "himalayas",
        title,
        company,
        companyLogo: (job.companyLogo as string) || undefined,
        location,
        jobType: (job.employmentType as string) || undefined,
        isRemote: true,
        salary: undefined,
        salaryMin: undefined,
        salaryMax: undefined,
        description,
        categories: compactUnique(categories),
        applyUrl: (job.applicationLink as string) || "",
        publishedAt,
      }
    })
  } catch (_error) {
    return []
  }
}

/**
 * Fetch jobs from Jobicy API (remote jobs)
 * Free, no auth.
 */
export async function fetchJobicyJobs(options?: {
  count?: number
}): Promise<JobListing[]> {
  await rateLimit("jobicy")

  const params = new URLSearchParams({
    count: String(options?.count || 50),
  })

  try {
    const response = await fetch(
      `https://jobicy.com/api/v2/remote-jobs?${params}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const jobs = Array.isArray(data.jobs) ? data.jobs : []

    return jobs.map((job: Record<string, unknown>): JobListing => {
      const title = sanitizeText(
        decodeHtmlEntitiesDeep((job.jobTitle as string) || "Unknown Title")
      )
      const company = sanitizeText(
        decodeHtmlEntitiesDeep((job.companyName as string) || "Unknown Company")
      )
      const description = sanitizeText(
        decodeHtmlEntitiesDeep(
          (job.jobDescription as string) || (job.jobExcerpt as string) || ""
        )
      )
      const location = sanitizeText((job.jobGeo as string) || "Remote")
      const jobTypes = (job.jobType as string[]) || []
      const industries = (job.jobIndustry as string[]) || []
      const categories = compactUnique([
        ...industries,
        ...jobTypes,
        (job.jobLevel as string | undefined) || "",
      ])

      const salary = normalizeSalaryRange({
        min: job.salaryMin as number | null,
        max: job.salaryMax as number | null,
        currency: job.salaryCurrency as string | null,
        period: job.salaryPeriod as string | null,
      })

      return {
        externalId: `jobicy_${job.id || job.jobSlug || title}`,
        source: "jobicy",
        title,
        company,
        companyLogo: (job.companyLogo as string) || undefined,
        location,
        jobType: jobTypes.length > 0 ? jobTypes.join(", ") : undefined,
        isRemote: true,
        salary: salary.salary,
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        description,
        categories: compactUnique(categories),
        applyUrl: (job.url as string) || "",
        publishedAt: new Date((job.pubDate as string) || Date.now()),
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
  const categoryKey = (options?.category || "").toLowerCase().trim()
  const categoryMapping = categoryKey
    ? (JOB_CATEGORIES as Record<string, { themuse: string; remotive: string }>)[
        categoryKey
      ]
    : null
  const themuseCategory = categoryMapping?.themuse || options?.category
  const remotiveCategory = categoryMapping?.remotive || options?.category

  const [museJobs, remotiveJobs, remoteOkJobs, arbeitnowJobs, himalayasJobs, jobicyJobs] =
    await Promise.allSettled([
      fetchTheMuseJobs({
        category: themuseCategory,
      }),
      fetchRemotiveJobs({
        category: remotiveCategory,
        search: options?.search,
      }),
      fetchRemoteOKJobs(),
      fetchArbeitnowJobs({
        search: options?.search,
      }),
      fetchHimalayasJobs(),
      fetchJobicyJobs(),
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
  if (arbeitnowJobs.status === "fulfilled") {
    allJobs.push(...arbeitnowJobs.value)
  }
  if (himalayasJobs.status === "fulfilled") {
    allJobs.push(...himalayasJobs.value)
  }
  if (jobicyJobs.status === "fulfilled") {
    allJobs.push(...jobicyJobs.value)
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
