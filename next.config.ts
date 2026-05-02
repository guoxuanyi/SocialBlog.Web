import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  async redirects() {
    return [
      {
        source: "/post/:id",
        destination: "/posts/:id",
        permanent: true,
      },
      {
        source: "/user/:username",
        destination: "/profile/:username",
        permanent: true,
      },
      {
        source: "/explore",
        destination: "/search",
        permanent: false,
      },
      {
        source: "/inbox",
        destination: "/activity",
        permanent: false,
      },
      {
        source: "/create",
        destination: "/posts/new",
        permanent: false,
      },
      {
        source: "/profile",
        destination: "/profile/demo",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, "");
    if (!apiBaseUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
