import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ExportRenderer } from "@/modules/integrations/application/ports/export-renderer"
import type { ExportRegistry } from "@/modules/integrations/application/ports/export-source"
import { buildExport } from "@/modules/integrations/application/use-cases/build-export"
import type { ExportFormat } from "@/modules/integrations/domain/export-contract"

const TENANT = "11111111-1111-1111-1111-111111111111"
const ACTOR = "22222222-2222-2222-2222-222222222222"

function setup(total: number) {
  const fetch = vi.fn(async () => ({
    rows: Array.from({ length: Math.min(total, 3) }, (_, i) => ({ name: `r${i}` })),
    total,
  }))
  const registry = {
    get: () => ({
      object: "materials" as const,
      label: "Materials",
      permission: "inventory.materials.read",
      columns: [{ key: "name", header: "Name", accessor: (r: unknown) => (r as { name: string }).name }],
      fetch,
    }),
  } as unknown as ExportRegistry
  const render = vi.fn(async () => new Uint8Array([1, 2, 3]))
  const renderers = {
    csv: { format: "csv", render } as ExportRenderer,
    xlsx: { format: "xlsx", render } as ExportRenderer,
  } as Record<ExportFormat, ExportRenderer>
  const append = vi.fn().mockResolvedValue(undefined)
  const audit = { append } as unknown as AuditRepository
  return { deps: { registry, renderers, audit }, fetch, render, append }
}

const input = (format: ExportFormat) => ({
  actorId: ACTOR,
  tenantId: TENANT,
  requestId: "33333333-3333-3333-3333-333333333333",
  object: "materials" as const,
  format,
  filters: { search: "tinta" },
  timestamp: "2026-06-10T12:00:00.000Z",
})

describe("buildExport", () => {
  it("fetches, renders, audits, and names the file", async () => {
    const { deps, render, append } = setup(3)
    const artifact = await buildExport(deps, input("csv"))
    expect(render).toHaveBeenCalled()
    expect(artifact.rowCount).toBe(3)
    expect(artifact.contentType).toContain("text/csv")
    expect(artifact.filename).toBe("materials_11111111_20260610.csv")
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "export.generated",
        source: "integrations",
        subjectType: "materials",
      }),
    )
  })

  it("uses the xlsx content type for xlsx format", async () => {
    const { deps } = setup(2)
    const artifact = await buildExport(deps, input("xlsx"))
    expect(artifact.contentType).toContain("spreadsheetml")
    expect(artifact.filename.endsWith(".xlsx")).toBe(true)
  })

  it("rejects exports over the sync row cap and does not render/audit", async () => {
    const { deps, render, append } = setup(99999)
    await expect(buildExport(deps, input("csv"))).rejects.toMatchObject({
      code: "EXPORT_TOO_LARGE",
    })
    expect(render).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })
})
