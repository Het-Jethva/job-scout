import { z } from "zod"

/**
 * Common validation schemas for form inputs and API requests
 */

// Email validation
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email is too long")

// Password validation for sign up
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")

// Password validation for sign in (less strict)
export const signInPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .max(128, "Password is too long")

// User name validation
export const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name is too long")
  .regex(
    /^[a-zA-Z\s'-]+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes"
  )
  .optional()

// Sign up form schema
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
})

// Sign in form schema
export const signInSchema = z.object({
  email: emailSchema,
  password: signInPasswordSchema,
})

// Resume upload validation
export const resumeUploadSchema = z.object({
  fileUrl: z.string().url("Invalid file URL"),
  fileName: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name is too long"),
  fileType: z.enum(
    [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    { message: "Invalid file type. Allowed: PDF, DOCX, TXT" }
  ),
  fileSize: z
    .number()
    .min(1)
    .max(4 * 1024 * 1024, "File size must be less than 4MB"),
})

// Job ID validation
export const jobIdSchema = z.string().cuid("Invalid job ID format")

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Job filters schema
export const jobFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  category: z.string().optional(),
  isRemote: z.boolean().optional(),
  search: z.string().max(200).optional(),
})

// Skill schema
export const skillSchema = z.object({
  skill: z
    .string()
    .min(1, "Skill name is required")
    .max(100, "Skill name is too long"),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  yearsExp: z.number().min(0).max(50).optional(),
})

// User preferences schema
export const userPreferencesSchema = z.object({
  preferredJobTypes: z.array(z.string()).max(10).optional(),
  preferredLocations: z.array(z.string()).max(20).optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  remoteOnly: z.boolean().optional(),
})

// Type exports
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ResumeUploadInput = z.infer<typeof resumeUploadSchema>
export type JobFiltersInput = z.infer<typeof jobFiltersSchema>
export type SkillInput = z.infer<typeof skillSchema>
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>

/**
 * Safe parse helper that returns a formatted error message
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Zod v4 uses issues instead of errors
  const errors = result.error.issues.map((e) => e.message).join(", ")
  return { success: false, error: errors }
}
