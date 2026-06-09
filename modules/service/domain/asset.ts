import type { UUID } from "@/types/shared"

export type AssetType =
  | "machinery"
  | "equipment"
  | "component"
  | "tool"
  | "other"

export type AssetCategory =
  | "printing"
  | "lamination"
  | "finishing"
  | "prepress"
  | "tooling"
  | "auxiliary"
  | "other"

export type AssetStatus = "active" | "in_maintenance" | "down" | "retired"

export type AssetCriticality = "low" | "medium" | "high" | "critical"

export const ASSET_TYPES: AssetType[] = [
  "machinery",
  "equipment",
  "component",
  "tool",
  "other",
]

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  machinery: "Maquinaria",
  equipment: "Equipo",
  component: "Componente",
  tool: "Herramienta",
  other: "Otro",
}

export const ASSET_CATEGORIES: AssetCategory[] = [
  "printing",
  "lamination",
  "finishing",
  "prepress",
  "tooling",
  "auxiliary",
  "other",
]

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  printing: "Impresión",
  lamination: "Laminación",
  finishing: "Acabados",
  prepress: "Preprensa",
  tooling: "Herramental",
  auxiliary: "Auxiliar",
  other: "Otro",
}

export const ASSET_STATUSES: AssetStatus[] = [
  "active",
  "in_maintenance",
  "down",
  "retired",
]

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Activo",
  in_maintenance: "En mantenimiento",
  down: "Fuera de servicio",
  retired: "Retirado",
}

export const ASSET_CRITICALITIES: AssetCriticality[] = [
  "low",
  "medium",
  "high",
  "critical",
]

export const ASSET_CRITICALITY_LABELS: Record<AssetCriticality, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
}

export type Asset = {
  id: UUID
  assetNumber: string
  name: string
  assetType: AssetType
  assetCategory: AssetCategory
  status: AssetStatus
  criticality: AssetCriticality
  healthScore: number | null
  productId: UUID | null
  productName: string | null
  companyId: UUID | null
  companyName: string | null
  parentAssetId: UUID | null
  parentAssetName: string | null
  serialNumber: string | null
  manufacturer: string | null
  model: string | null
  location: string | null
  installedAt: string | null
  warrantyUntil: string | null
  lastServiceAt: string | null
  nextServiceDueAt: string | null
  purchaseCost: number | null
  notes: string | null
  createdBy: UUID | null
  createdAt: string
  updatedAt: string
}

/** Fields a user may set when creating/editing an asset (status managed separately). */
export type AssetInput = {
  name: string
  assetType: AssetType
  assetCategory: AssetCategory
  criticality: AssetCriticality
  healthScore: number | null
  productId: UUID | null
  companyId: UUID | null
  parentAssetId: UUID | null
  serialNumber: string | null
  manufacturer: string | null
  model: string | null
  location: string | null
  installedAt: string | null
  warrantyUntil: string | null
  nextServiceDueAt: string | null
  purchaseCost: number | null
  notes: string | null
}

export type AssetFilters = {
  search: string | null
  status: AssetStatus | null
  category: AssetCategory | null
  criticality: AssetCriticality | null
  companyId: UUID | null
}

/** Lightweight option for selectors (case form, parent-asset picker). */
export type AssetOption = {
  id: UUID
  assetNumber: string
  name: string
}
