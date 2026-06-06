"use client"

import { createBrowserClient } from "@supabase/ssr"

import { publicEnv } from "@/lib/config/public-env"
import type { Database } from "@/types/database"

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
