import "server-only"

import { extractResumeData, generateEmbedding } from "@/lib/services/openrouter"
import { parseDocument } from "@/lib/services/document-parser"
import {
  createResumeRecord,
  deleteResumeById,
  findActiveResumeByUserId,
  listResumesByUserId,
  saveResumeEmbedding,
  setActiveResumeById,
} from "@/lib/repositories/resume-repository"
import {
  deleteResumeSourceFile,
  resolveStoredResumePath,
  uploadResumeSourceFile,
} from "@/lib/storage/resume-storage"

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
])

const MAX_FILE_SIZE = 4 * 1024 * 1024

function assertValidResumeFile(file: File) {
  if (!(file instanceof File)) {
    throw new Error("Please choose a resume file to upload")
  }

  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    throw new Error("Invalid file type. Please upload PDF, DOCX, or TXT.")
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum size is 4MB.")
  }
}

export async function uploadResumeForUser(userId: string, file: File) {
  assertValidResumeFile(file)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const buffer = Buffer.from(bytes)
  const parsedDocument = await parseDocument(buffer, file.type)
  const analysis = await extractResumeData(parsedDocument.text)
  const embedding = await generateEmbedding(parsedDocument.text)

  let storagePath: string | null = null

  try {
    const upload = await uploadResumeSourceFile({
      userId,
      fileName: file.name,
      contentType: file.type,
      bytes,
    })
    storagePath = upload.path

    const resume = await createResumeRecord({
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: upload.path,
      storagePath: upload.path,
      rawText: parsedDocument.text,
      parsedData: analysis,
      skills: analysis.skills.map((skill) => skill.name),
      experience: analysis.experience,
      education: analysis.education,
    })

    await saveResumeEmbedding(resume.id, embedding)

    return resume
  } catch (error) {
    if (storagePath) {
      try {
        await deleteResumeSourceFile(storagePath)
      } catch {
        // Best effort cleanup. The original failure is the one we want surfaced.
      }
    }

    throw error
  }
}

export async function getUserResumes(userId: string) {
  return listResumesByUserId(userId)
}

export async function getActiveResume(userId: string) {
  return findActiveResumeByUserId(userId)
}

export async function activateResume(userId: string, resumeId: string) {
  return setActiveResumeById(userId, resumeId)
}

export async function removeResume(userId: string, resumeId: string) {
  const deletedResume = await deleteResumeById(userId, resumeId)

  if (!deletedResume) {
    throw new Error("Resume not found")
  }

  const storagePath = resolveStoredResumePath({
    fileUrl: deletedResume.fileUrl,
    storagePath: deletedResume.storagePath,
  })

  if (storagePath) {
    try {
      await deleteResumeSourceFile(storagePath)
    } catch {
      // Best effort cleanup. The database state is the source of truth here.
    }
  }

  return deletedResume
}
