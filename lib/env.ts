import { z } from "zod"

/**
 * Centralized environment validation.
 * Fails fast during boot so production doesn’t start with bad config.
 */
const envSchema = z.object({
  // Database (Supabase PostgreSQL)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // AI
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),

  // App
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // Optional OAuth providers (configured in Supabase Dashboard)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Optional Job API keys
  THEMUSE_API_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
})

export type Env = z.infer<typeof envSchema>

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    // ZodError exposes validation issues under the `issues` array
    const formatted = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n")

    throw new Error(`Invalid environment variables:\n${formatted}`)
  }

  return result.data
}

// Parse once at module load so any missing values fail immediately.
export const env = parseEnv()

/**
 * Check if OAuth provider is properly configured in Supabase
 * Note: OAuth is now configured in Supabase Dashboard, these env vars are optional
 */
export function isOAuthConfigured(provider: "google" | "github"): boolean {
  if (provider === "google") {
    return !!(
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret"
    )
  }
  if (provider === "github") {
    return !!(
      env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET &&
      env.GITHUB_CLIENT_SECRET !== "your-github-client-secret"
    )
  }
  return false
}
