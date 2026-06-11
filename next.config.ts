import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Allow dev assets (CSS/JS/HMR) to be served to the phone through the
  // localtunnel origin. Without this, Next 16 blocks cross-origin dev
  // requests and the page renders unstyled.
  allowedDevOrigins: ["*.loca.lt"],
  // Workspace navigation IA (ADR-018): the sidebar groups modules by work area
  // (CRM / Service / Field Service). These redirects make the grouped, product
  // URLs valid entry points that resolve to the current flat routes, so shared
  // links like /field-service/work-orders keep working without moving files.
  async redirects() {
    return [
      {
        source: "/app/:tenant/crm/:path*",
        destination: "/app/:tenant/:path*",
        permanent: false,
      },
      {
        source: "/app/:tenant/service/:path*",
        destination: "/app/:tenant/:path*",
        permanent: false,
      },
      {
        source: "/app/:tenant/field-service/:path*",
        destination: "/app/:tenant/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
