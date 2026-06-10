/**
 * Minimal OpenAPI object-schema validator (ADR-025 #13). Returns the list of
 * violations (empty = compliant). Detects renamed/missing/extra fields and basic
 * type mismatches — enough to fail if runtime returns `materialId` where the spec
 * declares `id`.
 */
type JsonType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null"

type ObjectSchema = {
  type: "object"
  properties: Record<string, { type: JsonType | readonly JsonType[]; format?: string }>
  required?: readonly string[]
}

function typeOf(value: unknown): JsonType {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  if (Number.isInteger(value)) return "integer"
  return typeof value as JsonType
}

function typeMatches(allowed: JsonType | readonly JsonType[], actual: JsonType): boolean {
  const list = Array.isArray(allowed) ? allowed : [allowed]
  // integer satisfies number; integer value also satisfies integer
  return list.some((t) => t === actual || (t === "number" && actual === "integer"))
}

export function validateAgainstSchema(
  schema: ObjectSchema,
  value: unknown,
): string[] {
  const errors: string[] = []
  if (typeOf(value) !== "object") return [`expected object, got ${typeOf(value)}`]
  const obj = value as Record<string, unknown>

  for (const req of schema.required ?? []) {
    if (!(req in obj)) errors.push(`missing required property: ${req}`)
  }
  for (const key of Object.keys(obj)) {
    const prop = schema.properties[key]
    if (!prop) {
      errors.push(`unexpected property: ${key}`)
      continue
    }
    if (!typeMatches(prop.type, typeOf(obj[key]))) {
      errors.push(
        `type mismatch for ${key}: expected ${JSON.stringify(prop.type)}, got ${typeOf(obj[key])}`,
      )
    }
  }
  return errors
}
