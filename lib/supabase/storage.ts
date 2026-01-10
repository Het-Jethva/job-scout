import { createClient } from "@/lib/supabase/server"

const RESUME_BUCKET = "resumes"

/**
 * Upload a resume file to Supabase Storage (server-side)
 */
export async function uploadResume(
  userId: string,
  file: File
): Promise<{ url: string; path: string } | { error: string }> {
  const supabase = await createClient()

  // Generate unique filename
  const fileExt = file.name.split(".").pop()
  const fileName = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    return { error: error.message }
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(data.path)

  return { url: publicUrl, path: data.path }
}

/**
 * Delete a resume file from Supabase Storage
 */
export async function deleteResumeFile(
  path: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.storage.from(RESUME_BUCKET).remove([path])

  if (error) {
    return { error: error.message }
  }

  return {}
}

/**
 * Get a signed URL for a private resume file
 */
export async function getResumeSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) {
    return { error: error.message }
  }

  return { url: data.signedUrl }
}

/**
 * Download resume file content
 */
export async function downloadResume(
  path: string
): Promise<{ data: Blob } | { error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .download(path)

  if (error) {
    return { error: error.message }
  }

  return { data }
}
