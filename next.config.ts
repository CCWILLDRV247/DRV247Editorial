import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
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
    ];
  },
};

export default nextConfig;
