import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: 'http://localhost:8888/v1',
    NEXT_PUBLIC_WS_BASE_URL: 'ws://localhost:8888/ws',
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8888/v1/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'http://localhost:8888/ws/:path*',
      },
    ]
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
