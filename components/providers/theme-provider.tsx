"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = "theme"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

/**
 * Minimal theme provider. Replaces next-themes, whose injected <script> is not
 * compatible with React 19 client rendering ("Encountered a script tag…").
 * The no-flash class is set by a server-rendered inline script in the root
 * layout; this provider only manages runtime toggling and the React context.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default a oscuro: identidad "Sistema Operacional" (mockups de diseño).
  // El usuario puede cambiarlo con el toggle; la preferencia persiste.
  const [theme, setThemeState] = React.useState<Theme>("dark")
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>("dark")

  // Read the persisted preference once on mount.
  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(stored)
    }
  }, [])

  // Apply the resolved theme to <html> and follow the system preference.
  React.useEffect(() => {
    const apply = () => {
      const resolved = theme === "system" ? getSystemTheme() : theme
      setResolvedTheme(resolved)
      document.documentElement.classList.toggle("dark", resolved === "dark")
    }
    apply()

    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = React.useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    setThemeState(next)
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
