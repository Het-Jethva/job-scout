import type { Prisma } from "@prisma/client"

export function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function toPlainData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return toPlainData(value) as Prisma.InputJsonValue
}
