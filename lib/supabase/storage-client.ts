import { createClient } from "@/lib/supabase/client"

const RESUME_BUCKET = "resumes"

/**
 * Upload a resume file to Supabase Storage (client-side)
 */
export async function uploadResumeClient(
  userId: string,
  file: File
): Promise<{ url: string; path: string } | { error: string }> {
  const supabase = createClient()

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
