import "server-only"

import { createClient } from "@supabase/supabase-js"
import { publicEnv } from "@/lib/config/public-env"
import { getSupabaseAdminEnv } from "@/lib/config/server-env"

export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getSupabaseAdminEnv()

  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
