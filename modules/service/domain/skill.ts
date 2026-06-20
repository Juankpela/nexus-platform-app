import type { UUID } from "@/types/shared"

/** Ordinal capability level. Order matters — it powers "nivel ≥ requerido" (PR4). */
export type SkillLevel = "junior" | "mid" | "senior" | "expert"

export const SKILL_LEVELS: SkillLevel[] = ["junior", "mid", "senior", "expert"]

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  junior: "Junior",
  mid: "Intermedio",
  senior: "Senior",
  expert: "Experto",
}

const SKILL_LEVEL_RANK: Record<SkillLevel, number> = {
  junior: 1,
  mid: 2,
  senior: 3,
  expert: 4,
}

/** Numeric rank for comparison. Higher = more capable. */
export function skillLevelRank(level: SkillLevel): number {
  return SKILL_LEVEL_RANK[level]
}

/**
 * Whether a held level satisfies a required minimum. Pure; consumed by the PR4
 * eligibility filter (kept here so the rule lives in one place, not duplicated).
 */
export function meetsSkillLevel(held: SkillLevel, required: SkillLevel): boolean {
  return skillLevelRank(held) >= skillLevelRank(required)
}

/** Tenant-configurable skill catalog entry. */
export type Skill = {
  id: UUID
  name: string
  /** Vocabulario propio del tenant para reconocer la skill en texto libre (Hito B). */
  aliases: string[]
  /** Tipos de daño frecuentes (Paso 2 del reporte público guiado). */
  incidentTypes: string[]
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type SkillInput = {
  name: string
  aliases?: string[]
}
