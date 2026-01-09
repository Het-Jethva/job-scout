"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Update user profile
 */
export async function updateProfile(data: { name: string }) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { name: data.name },
    })

    revalidatePath("/settings")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (_error) {
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
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await db.userPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        preferredJobTypes: data.preferredJobTypes,
        preferredLocations: data.preferredLocations,
        salaryMin: data.minSalary,
        salaryMax: data.maxSalary,
        remoteOnly: data.remoteOnly,
      },
      update: {
        preferredJobTypes: data.preferredJobTypes,
        preferredLocations: data.preferredLocations,
        salaryMin: data.minSalary,
        salaryMax: data.maxSalary,
        remoteOnly: data.remoteOnly,
      },
    })

    revalidatePath("/settings")
    revalidatePath("/jobs")
    revalidatePath("/matches")

    return { success: true }
  } catch (_error) {
    return { success: false, error: "Failed to update preferences" }
  }
}

/**
 * Delete user account and all associated data
 */
export async function deleteAccount() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    // Delete user (cascade will handle related records)
    await db.user.delete({
      where: { id: session.user.id },
    })

    return { success: true }
  } catch (_error) {
    return { success: false, error: "Failed to delete account" }
  }
}
