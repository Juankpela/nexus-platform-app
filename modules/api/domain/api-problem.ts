/** RFC 7807 problem+json (ADR-025 #5/#15). `requestId` always present. */
export type Problem = {
  type: string
  title: string
  status: number
  detail?: string
  requestId: string
}

/** Application error code → HTTP status. Unknown codes map to 500. */
const CODE_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_REQUEST: 400,
  INVALID_CURSOR: 400,
  RATE_LIMITED: 429,
}

const TITLE: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
}

export function problemFor(
  code: string,
  detail: string,
  requestId: string,
): Problem {
  const status = CODE_STATUS[code] ?? 500
  return {
    type: `https://docs.nexus/errors/${code.toLowerCase()}`,
    title: TITLE[status] ?? "Error",
    status,
    detail,
    requestId,
  }
}
