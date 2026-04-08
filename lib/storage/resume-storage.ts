import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

const RESUME_BUCKET = "resumes"

function sanitizeFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase()
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "bin"
}

export function resolveStoredResumePath(input: {
  fileUrl: string
  storagePath?: string | null
}) {
  if (input.storagePath) {
    return input.storagePath
  }

  if (!input.fileUrl) {
    return null
  }

  if (!input.fileUrl.startsWith("http://") && !input.fileUrl.startsWith("https://")) {
    return input.fileUrl
  }

  try {
    const parsedUrl = new URL(input.fileUrl)
    const segments = parsedUrl.pathname.split("/")
    const bucketIndex = segments.findIndex((segment) => segment === RESUME_BUCKET)

    if (bucketIndex === -1) {
      return null
    }

    return decodeURIComponent(segments.slice(bucketIndex + 1).join("/"))
  } catch {
    return null
  }
}

export async function uploadResumeSourceFile(input: {
  userId: string
  fileName: string
  contentType: string
  bytes: Uint8Array
}) {
  const supabase = createAdminClient()
  const extension = sanitizeFileExtension(input.fileName)
  const filePath = `${input.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(RESUME_BUCKET).upload(filePath, input.bytes, {
    contentType: input.contentType,
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    throw new Error(`Failed to store resume file: ${error.message}`)
  }

  return {
    bucket: RESUME_BUCKET,
    path: filePath,
  }
}

export async function deleteResumeSourceFile(path: string | null | undefined) {
  if (!path) {
    return
  }

  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(RESUME_BUCKET).remove([path])

  if (error) {
    throw new Error(`Failed to delete stored resume: ${error.message}`)
  }
}
