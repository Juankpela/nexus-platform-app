import { cn } from "@/lib/utils"

// Renders ONLY the official uploaded brand assets in public/brand/.
// To update the brand, overwrite those PNG files — no code changes needed.
//   nexus-logo-light.png  → full logo for light surfaces (dark wordmark)
//   nexus-logo-dark.png   → full logo for dark surfaces  (light wordmark)
//   nexus-icon.png        → N icon only (collapsed sidebar, favicons, avatars)

const ASSETS = {
  light: "/brand/nexus-logo-light.png",
  dark: "/brand/nexus-logo-dark.png",
  icon: "/brand/nexus-icon.png",
} as const

type NexusLogoProps = {
  /** "full" = N + NEXUS + tagline lockup; "icon" = N symbol only. */
  variant?: "full" | "icon"
  /** Which full-logo asset to use, by surface. Ignored for the icon. */
  theme?: "light" | "dark"
  className?: string
  alt?: string
  priority?: boolean
}

export function NexusLogo({
  variant = "full",
  theme = "light",
  className,
  alt = "Nexus — Where Operations Connect.",
}: NexusLogoProps) {
  const src =
    variant === "icon" ? ASSETS.icon : theme === "dark" ? ASSETS.dark : ASSETS.light

  return (
    // The official assets have an unknown intrinsic ratio per upload; a plain
    // <img> with height-only sizing preserves the aspect ratio exactly. Using
    // next/image here would require hardcoded dimensions and risk distortion.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={cn("w-auto select-none object-contain", className)}
    />
  )
}
