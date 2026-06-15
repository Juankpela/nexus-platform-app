"use client"

import { useEffect, useState, type ReactNode } from "react"

/**
 * Renders children only after mount (client-side). Used to sidestep a Next 16
 * SSR bug where some Radix Dialog triggers fail to render server-side depending
 * on the surrounding client-component tree. The wrapped control appears right
 * after hydration.
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag
  useEffect(() => setMounted(true), [])
  return mounted ? <>{children}</> : null
}
