import "server-only"

import { z } from "zod"

type InferSchema<T extends z.ZodTypeAny> = z.infer<T>

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n")
}

function createServerEnvReader<T extends z.ZodTypeAny>(
  label: string,
  schema: T,
  values: () => Record<string, unknown>
) {
  let cached: InferSchema<T> | null = null

  return function read(): InferSchema<T> {
    if (cached) {
      return cached
    }

    const result = schema.safeParse(values())

    if (!result.success) {
      throw new Error(
        `Invalid ${label} environment variables:\n${formatIssues(result.error)}`
      )
    }

    cached = result.data
    return cached
  }
}

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
})

const supabaseAdminEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
})

const aiEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
})

export const getDatabaseEnv = createServerEnvReader(
  "database",
  databaseEnvSchema,
  () => ({
    DATABASE_URL: process.env.DATABASE_URL,
  })
)

export const getSupabaseAdminEnv = createServerEnvReader(
  "supabase admin",
  supabaseAdminEnvSchema,
  () => ({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
)

export const getAiEnv = createServerEnvReader("AI", aiEnvSchema, () => ({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
}))
