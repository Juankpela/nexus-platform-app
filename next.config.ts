import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
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
