/** Private object storage for generated export files (signed-URL download only). */
export interface ExportStorage {
  upload(path: string, body: Uint8Array, contentType: string): Promise<void>
  /** Mint a short-TTL signed URL for an existing object. */
  createSignedUrl(path: string, ttlSeconds: number): Promise<string>
}
