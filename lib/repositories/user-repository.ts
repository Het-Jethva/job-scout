import "server-only"

import { db } from "@/lib/db"

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
  const existingUser = await db.user.findUnique({
    where: { id: input.id },
  })

  if (existingUser) {
    return db.user.update({
      where: { id: input.id },
      data: {
        email: input.email,
        name: input.name,
        image: input.image,
        emailVerified: input.emailVerified,
      },
    })
  }

  const userWithSameEmail = await db.user.findUnique({
    where: { email: input.email },
  })

  if (userWithSameEmail) {
    return db.user.update({
      where: { email: input.email },
      data: {
        id: input.id,
        name: input.name ?? userWithSameEmail.name,
        image: input.image ?? userWithSameEmail.image,
        emailVerified: input.emailVerified,
      },
    })
  }

  return db.user.create({
    data: {
      id: input.id,
      email: input.email,
      name: input.name,
      image: input.image,
      emailVerified: input.emailVerified,
    },
  })
}
