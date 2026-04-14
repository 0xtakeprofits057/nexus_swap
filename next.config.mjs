/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for wagmi/viem SSR compatibility
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    // Stub out React Native async storage (required by @metamask/sdk but unused on web)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    }
    return config
  },
}

export default nextConfig
