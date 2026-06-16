import { NextRequest, NextResponse } from "next/server"

import { refreshSupabaseSession } from "@/lib/supabase/proxy"

const protectedPrefixes = ["/app/", "/platform", "/portal/", "/select-tenant"]
const authRoutes = ["/login"]

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie))
  return to
}

function applySecurityHeaders(response: NextResponse, requestId: string) {
  response.headers.set("x-request-id", requestId)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)",
  )
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    )
  }
  return response
}

export async function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  const wsOrigin = `wss://${supabaseUrl.host}`
  const scriptPolicy =
    process.env.NODE_ENV === "development"
      ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `'self' 'nonce-${nonce}' 'strict-dynamic'`
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptPolicy}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseUrl.origin} ${wsOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ")
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-request-id", requestId)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)

  const requestWithContext = new NextRequest(request, { headers: requestHeaders })
  const { response, userId } = await refreshSupabaseSession(requestWithContext)
  response.headers.set("Content-Security-Policy", contentSecurityPolicy)
  const pathname = request.nextUrl.pathname
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  )
  const isAuthRoute = authRoutes.includes(pathname)

  if (isProtected && !userId) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
    return applySecurityHeaders(
      copyCookies(response, NextResponse.redirect(loginUrl)),
      requestId,
    )
  }

  if (isAuthRoute && userId) {
    return applySecurityHeaders(
      copyCookies(
        response,
        NextResponse.redirect(new URL("/select-tenant", request.url)),
      ),
      requestId,
    )
  }

  return applySecurityHeaders(response, requestId)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
