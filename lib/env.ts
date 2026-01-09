import { z } from "zod"

/**
 * Centralized environment validation.
 * Fails fast during boot so production doesn’t start with bad config.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // AI
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),

  // File Storage
  UPLOADTHING_TOKEN: z.string().min(1, "UPLOADTHING_TOKEN is required"),

  // Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),

  // App
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // Optional OAuth providers
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
    const formatted = result.error.errors
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n")

    throw new Error(`Invalid environment variables:\n${formatted}`)
  }

  return result.data
}

// Parse once at module load so any missing values fail immediately.
export const env = parseEnv()

/**
 * Check if OAuth provider is properly configured
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
