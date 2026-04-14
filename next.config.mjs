/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for wagmi/viem SSR compatibility
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding', '@react-native-async-storage/async-storage')
    return config
  },
}

export default nextConfig
