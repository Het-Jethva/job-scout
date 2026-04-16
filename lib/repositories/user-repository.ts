import "server-only"

import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export interface AuthenticatedUserRecord {
  id: string
  email: string
  name: string | null
  image: string | null
  emailVerified: boolean
}

export async function findUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
  })
}

export async function upsertUserFromAuth(input: AuthenticatedUserRecord) {
  try {
    return await db.user.upsert({
      where: { id: input.id },
      update: {
        email: input.email,
        name: input.name,
        image: input.image,
        emailVerified: input.emailVerified,
      },
      create: {
        id: input.id,
        email: input.email,
        name: input.name,
        image: input.image,
        emailVerified: input.emailVerified,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return db.user.update({
        where: { email: input.email },
        data: {
          id: input.id,
          name: input.name,
          image: input.image,
          emailVerified: input.emailVerified,
        },
      })
    }

    throw error
  }
}
