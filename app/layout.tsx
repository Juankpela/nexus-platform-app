import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/providers/service-worker-register"
import { ThemeProvider } from "@/components/providers/theme-provider"

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base absoluta para que og:image/icons resuelvan a URL completa (WhatsApp,
  // que arma la vista previa del enlace, exige URLs absolutas).
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://nexus-platform-app-rouge.vercel.app",
  ),
  title: {
    default: "Nexus",
    template: "%s | Nexus",
  },
  description: "Enterprise operations platform",
  manifest: "/manifest.webmanifest",
  // Logo oficial de Nexus → favicon + avatar de la vista previa del enlace.
  icons: {
    icon: "/brand/nexus-icon.png",
    shortcut: "/brand/nexus-icon.png",
    apple: "/brand/nexus-icon.png",
  },
  // Vista previa del enlace (WhatsApp/redes): muestra el logo de Nexus.
  openGraph: {
    title: "Nexus",
    description: "Enterprise operations platform",
    siteName: "Nexus",
    type: "website",
    images: ["/brand/nexus-icon.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nexus",
  },
};

export const viewport: Viewport = {
  themeColor: "#071326",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
