import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type { ExportStorage } from "@/modules/integrations/application/ports/export-storage"

const BUCKET = "exports"

/** Supabase Storage adapter for the private `exports` bucket (service role). */
export class SupabaseExportStorage implements ExportStorage {
  async upload(path: string, body: Uint8Array, contentType: string): Promise<void> {
    const admin = createAdminSupabaseClient()
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, body, { contentType, upsert: true })
    if (error) {
      throw new ApplicationError("Unable to store export file.", "EXPORT_UPLOAD_FAILED", error)
    }
  }

  async createSignedUrl(path: string, ttlSeconds: number): Promise<string> {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, ttlSeconds)
    if (error || !data?.signedUrl) {
      throw new ApplicationError("Unable to create download link.", "EXPORT_SIGNED_URL_FAILED", error)
    }
    return data.signedUrl
  }
}
