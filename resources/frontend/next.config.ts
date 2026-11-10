import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/thyaga',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
