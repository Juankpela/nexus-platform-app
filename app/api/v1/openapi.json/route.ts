import { NextResponse } from "next/server"

import { OPENAPI_SPEC } from "@/modules/api/domain/openapi-spec"

// Public OpenAPI 3.1 contract (ADR-025 #13). Unauthenticated so consumers can read it.
export function GET() {
  return NextResponse.json(OPENAPI_SPEC)
}
