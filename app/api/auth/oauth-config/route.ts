import { isOAuthConfigured } from "@/lib/env"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    google: isOAuthConfigured("google"),
    github: isOAuthConfigured("github"),
  })
}
