import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    API_BASE_URL: 'http://localhost:8888/v1',
    WS_BASE_URL: 'ws://localhost:8888/ws',
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
