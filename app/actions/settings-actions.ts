"use server"

import { requireAuth } from "@/lib/auth-utils"
import {
  deleteUserById,
  updateUserProfileById,
  upsertUserPreferences,
} from "@/lib/domains/user/repository"
import {
  getValidationErrorMessage,
  revalidatePaths,
} from "@/lib/action-utils"
import { profileUpdateSchema, userPreferencesSchema } from "@/lib/validations"
import { RATE_LIMITS, checkRateLimit, rateLimitError } from "@/lib/rate-limit"

/**
 * Update user profile
 */
export async function updateProfile(data: { name: string }) {
  // Validate input
  const validation = profileUpdateSchema.safeParse(data)
  if (!validation.success) {
    return {
      success: false,
      error: getValidationErrorMessage(validation.error),
    }
  }

  try {
    const session = await requireAuth()

    await updateUserProfileById(session.user.id, validation.data.name)

    revalidatePaths(["/settings", "/dashboard"])

    return { success: true }
  } catch {
    return { success: false, error: "Failed to update profile" }
  }
}

/**
 * Update user job preferences
 */
export async function updatePreferences(data: {
  preferredJobTypes: string[]
  preferredLocations: string[]
  minSalary?: number
  maxSalary?: number
  remoteOnly: boolean
}) {
  // Validate input
  const validation = userPreferencesSchema.safeParse({
    preferredJobTypes: data.preferredJobTypes,
    preferredLocations: data.preferredLocations,
    salaryMin: data.minSalary,
    salaryMax: data.maxSalary,
    remoteOnly: data.remoteOnly,
  })
  if (!validation.success) {
    return {
      success: false,
      error: getValidationErrorMessage(validation.error),
    }
  }

  try {
    const session = await requireAuth()

    await upsertUserPreferences({
      userId: session.user.id,
      preferredJobTypes: data.preferredJobTypes,
      preferredLocations: data.preferredLocations,
      salaryMin: data.minSalary,
      salaryMax: data.maxSalary,
      remoteOnly: data.remoteOnly,
    })

    revalidatePaths(["/settings", "/jobs", "/matches"])

    return { success: true }
  } catch {
    return { success: false, error: "Failed to update preferences" }
  }
}

/**
 * Delete user account and all associated data
 */
export async function deleteAccount() {
  try {
    const session = await requireAuth()

    // Apply strict rate limiting for sensitive operations
    const rateLimitResult = checkRateLimit(`user:${session.user.id}`, RATE_LIMITS.sensitive)
    if (!rateLimitResult.success) {
      return rateLimitError(rateLimitResult)
    }

    await deleteUserById(session.user.id)

    return { success: true }
  } catch {
    return { success: false, error: "Failed to delete account" }
  }
}

