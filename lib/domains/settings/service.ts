import "server-only"

import { db } from "@/lib/db"
import { createAdminClient } from "@/lib/supabase/admin"
import { deleteResumeSourceFile, resolveStoredResumePath } from "@/lib/storage/resume-storage"

export async function updateUserProfile(input: {
  userId: string
  name: string
}) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(input.userId, {
    user_metadata: {
      name: input.name,
      full_name: input.name,
    },
  })

  if (error) {
    throw new Error(`Failed to update profile metadata: ${error.message}`)
  }

  return db.user.update({
    where: { id: input.userId },
    data: { name: input.name },
  })
}

export async function deleteUserAccount(userId: string) {
  const resumes = await db.resume.findMany({
    where: { userId },
    select: {
      fileUrl: true,
      storagePath: true,
    },
  })

  const admin = createAdminClient()
  const authDelete = await admin.auth.admin.deleteUser(userId)
  if (authDelete.error) {
    throw new Error(`Failed to delete auth user: ${authDelete.error.message}`)
  }

  await db.user.delete({
    where: { id: userId },
  })

  const storagePaths = resumes
    .map((resume) =>
      resolveStoredResumePath({
        fileUrl: resume.fileUrl,
        storagePath: resume.storagePath,
      })
    )
    .filter((path): path is string => !!path)

  await Promise.allSettled(
    storagePaths.map((path) => deleteResumeSourceFile(path))
  )
}
