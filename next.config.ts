import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.0.75"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Intelligence JSON is imported into the server bundle. The seed CSV is still
  // read from disk (adapter identifier), so the serverless trace must include it.
  // Do not load that CSV via import.meta.url — Turbopack rewrites it and crashes.
  outputFileTracingIncludes: {
    "/*": ["./config/intelligence/**/*", "./config/print-publications.json"],
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/category/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/story/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/category/racing", destination: "/category/motorsport", permanent: true },
      { source: "/category/classic", destination: "/category/cars", permanent: true },
      { source: "/category/modified", destination: "/category/cars", permanent: true },
      { source: "/category/concourse", destination: "/category/events", permanent: true },
      { source: "/for-you", destination: "/", permanent: false },
      { source: "/intelligence/print", destination: "/", permanent: false },
      { source: "/intelligence/print/:slug", destination: "/print/:slug", permanent: false },
      { source: "/print/gt-purely-porsche", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
