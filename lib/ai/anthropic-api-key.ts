const MISSING_KEY_MESSAGE =
  "ANTHROPIC_API_KEY no está disponible en el runtime. Verifica que esté configurada en Vercel (Production) y vuelve a desplegar."

/**
 * Resolves and validates the Anthropic API key from a raw env value.
 * Pure (no I/O, not server-only) so it can be unit-tested; the server-only
 * client factory (createAnthropicClient) delegates here. Preserves the exact
 * runtime error the forecasting use-case raised before centralization.
 */
export function resolveAnthropicApiKey(raw: string | undefined): string {
  const apiKey = raw?.trim()
  if (!apiKey) {
    throw new Error(MISSING_KEY_MESSAGE)
  }
  return apiKey
}
