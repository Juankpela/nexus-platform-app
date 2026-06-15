"use client"

import { useSyncExternalStore, type ReactNode } from "react"

const subscribe = () => () => {}

/**
 * Renders children only after client-side mount. Used to host create/import
 * dialog triggers inside empty states without tripping the Next 16 SSR bug where
 * a Radix Dialog placed after another Dialog client subtree fails to render its
 * trigger (same family of issue the `order-last` workaround addresses).
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  return mounted ? <>{children}</> : null
}
