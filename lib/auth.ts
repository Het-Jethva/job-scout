import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { db } from "./db"
import { env, isOAuthConfigured } from "./env"

// Check if OAuth providers are properly configured (not placeholder values)
const googleConfigured = isOAuthConfigured("google")
const githubConfigured = isOAuthConfigured("github")

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  socialProviders: {
    ...(googleConfigured && {
      google: {
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
      },
    }),
    ...(githubConfigured && {
      github: {
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
      },
    }),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  rateLimit: {
    window: 60, // 1 minute
    max: 10, // 10 requests per minute for auth endpoints
  },
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

// Export OAuth configuration status for UI
export const oauthConfig = {
  google: googleConfigured,
  github: githubConfigured,
}
