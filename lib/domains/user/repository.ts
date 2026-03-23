import { db } from "@/lib/db"

export interface AuthUserRecord {
  id: string
  email?: string | null
  user_metadata?: {
    name?: string
    full_name?: string
    avatar_url?: string
    picture?: string
  }
  email_confirmed_at?: string | null
}

function mapAuthUserToPersistence(authUser: AuthUserRecord) {
  return {
    email: authUser.email ?? "",
    name: authUser.user_metadata?.name ?? authUser.user_metadata?.full_name ?? null,
    image:
      authUser.user_metadata?.avatar_url ??
      authUser.user_metadata?.picture ??
      null,
    emailVerified: authUser.email_confirmed_at != null,
  }
}

export async function syncAuthUser(authUser: AuthUserRecord) {
  const existingById = await db.user.findUnique({
    where: { id: authUser.id },
  })

  const persistedUser = mapAuthUserToPersistence(authUser)

  if (existingById) {
    return db.user.update({
      where: { id: authUser.id },
      data: persistedUser,
    })
  }

  const existingByEmail = authUser.email
    ? await db.user.findUnique({
        where: { email: authUser.email },
      })
    : null

  if (existingByEmail) {
    return db.user.update({
      where: { email: authUser.email ?? "" },
      data: {
        id: authUser.id,
        ...persistedUser,
      },
    })
  }

  return db.user.create({
    data: {
      id: authUser.id,
      ...persistedUser,
    },
  })
}

export async function findUserSettingsById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      userPreferences: true,
      userSkills: true,
    },
  })
}

export async function updateUserProfileById(userId: string, name: string) {
  return db.user.update({
    where: { id: userId },
    data: { name },
  })
}

export async function upsertUserPreferences(input: {
  userId: string
  preferredJobTypes: string[]
  preferredLocations: string[]
  salaryMin?: number
  salaryMax?: number
  remoteOnly: boolean
}) {
  return db.userPreference.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      preferredJobTypes: input.preferredJobTypes,
      preferredLocations: input.preferredLocations,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      remoteOnly: input.remoteOnly,
    },
    update: {
      preferredJobTypes: input.preferredJobTypes,
      preferredLocations: input.preferredLocations,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      remoteOnly: input.remoteOnly,
    },
  })
}

export async function deleteUserById(userId: string) {
  return db.user.delete({
    where: { id: userId },
  })
}
