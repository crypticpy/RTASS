import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdf-parse': false,
        canvas: false,
      };
    }
    return config;
  },
  serverExternalPackages: ['pdf-parse', 'canvas'],
};

export default nextConfig;
