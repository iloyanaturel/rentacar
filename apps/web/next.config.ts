import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@rentaflow/shared'],
  poweredByHeader: false,
  // npm workspaces hoist dependencies to the repo root — required on Vercel
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
