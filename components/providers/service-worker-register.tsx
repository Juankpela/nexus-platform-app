"use client"

import { useEffect } from "react"

// Registers the PWA service worker (see public/sw.js) on the client. Renders
// nothing. Registration only runs in production-served, secure contexts where
// the API exists, so dev/HMR is unaffected.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: the app works without the SW; it just isn't installable.
      })
    }
    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register)
      return () => window.removeEventListener("load", register)
    }
  }, [])

  return null
}
