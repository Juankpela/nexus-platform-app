/**
 * Public OpenAPI 3.1 contract (ADR-025 #13) — the source of truth. Served at
 * /api/v1/openapi.json and validated against runtime responses by a contract test.
 * One path per shipped endpoint (release gate).
 */
export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: { title: "NEXUS Public API", version: "1.0.0" },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key: nxs_live_… / nxs_test_…",
      },
    },
    schemas: {
      Material: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          sku: { type: ["string", "null"] },
          name: { type: "string" },
          unitOfMeasure: { type: "string" },
          active: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "name", "unitOfMeasure", "active", "createdAt", "updatedAt"],
      },
      Problem: {
        type: "object",
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          requestId: { type: "string" },
        },
        required: ["type", "title", "status", "requestId"],
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/materials": {
      get: {
        summary: "List materials",
        operationId: "listMaterials",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 100 } },
          { name: "cursor", in: "query", schema: { type: "string" }, description: "Opaque keyset cursor" },
          { name: "active", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          "200": {
            description: "A page of materials",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Material" } },
                    page: {
                      type: "object",
                      properties: {
                        nextCursor: { type: ["string", "null"] },
                        hasMore: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
          "403": { description: "Missing scope", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
          "429": { description: "Rate limited", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
        },
      },
    },
  },
} as const
