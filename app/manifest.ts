import type { MetadataRoute } from "next"

// PWA manifest — makes NEXUS installable ("Add to Home Screen") so the field
// worker experience runs full-screen and app-like. Offline caching is NOT
// configured here (that is FWX-3); the service worker is a passthrough.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexus — Field Service",
    short_name: "Nexus",
    description: "Enterprise operations platform — field worker experience",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
