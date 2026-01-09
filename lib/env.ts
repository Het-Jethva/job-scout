import { z } from "zod"

/**
 * Environment variable validation schema
 * This ensures all required environment variables are present and valid at startup
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid URL"),

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

/**
 * Validate environment variables
 * Call this at app startup to fail fast if config is invalid
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    throw new Error("Invalid environment variables")
  }

  return result.data
}

/**
 * Get validated environment variables
 * Use this throughout the app for type-safe env access
 */
export function getEnv() {
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    THEMUSE_API_KEY: process.env.THEMUSE_API_KEY,
    NODE_ENV: process.env.NODE_ENV || "development",
  }
}

/**
 * Check if OAuth provider is properly configured
 */
export function isOAuthConfigured(provider: "google" | "github"): boolean {
  if (provider === "google") {
    return !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret"
    )
  }
  if (provider === "github") {
    return !!(
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET &&
      process.env.GITHUB_CLIENT_SECRET !== "your-github-client-secret"
    )
  }
  return false
}
