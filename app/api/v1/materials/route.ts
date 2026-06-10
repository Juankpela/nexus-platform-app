import { ApplicationError } from "@/lib/errors/application-error"
import { apiGate } from "@/modules/api/composition"
import { decodeCursor, encodeCursor } from "@/modules/api/domain/cursor"
import { toMaterialResource } from "@/modules/api/presentation/material-resource"
import { listMaterialsApiPage } from "@/modules/inventory/composition"

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 100

// GET /api/v1/materials — public, read-only, keyset-paginated (ADR-025).
export async function GET(req: Request) {
  return apiGate(req, "materials:read", async (ctx) => {
    const url = new URL(req.url)

    const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "", 10)
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
      : DEFAULT_LIMIT

    let afterId: string | null = null
    const cursorParam = url.searchParams.get("cursor")
    if (cursorParam) {
      const cursor = decodeCursor(cursorParam)
      if (!cursor) throw new ApplicationError("Invalid cursor.", "INVALID_CURSOR")
      afterId = cursor.id
    }

    const activeParam = url.searchParams.get("active")
    const active =
      activeParam === "true" ? true : activeParam === "false" ? false : null

    const { items, nextAfterId } = await listMaterialsApiPage(ctx.tenantId, {
      afterId,
      limit,
      active,
    })

    return {
      // Column allowlist via the shared resource mapper (contract-tested, ADR-025 #10/#13).
      data: items.map(toMaterialResource),
      page: {
        nextCursor: nextAfterId ? encodeCursor({ id: nextAfterId }) : null,
        hasMore: nextAfterId !== null,
      },
    }
  })
}
