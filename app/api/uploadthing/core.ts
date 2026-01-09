import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const f = createUploadthing()

export const ourFileRouter = {
  // Resume uploader - accepts PDF, DOCX, and TXT files
  resumeUploader: f({
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    "text/plain": { maxFileSize: "1MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      // Authenticate user
      const session = await auth.api.getSession({
        headers: await headers(),
      })

      if (!session?.user) {
        throw new UploadThingError("Unauthorized")
      }

      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
