import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@rentaflow/shared'],
  poweredByHeader: false,
};

export default nextConfig;
