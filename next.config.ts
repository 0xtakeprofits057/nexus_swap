import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for wagmi/viem SSR compatibility
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
}

export default nextConfig
