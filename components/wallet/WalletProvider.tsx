'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider }                                     from 'wagmi'
import { http }                                              from 'wagmi'
import { polygon, mainnet, arbitrum, optimism, base }        from 'wagmi/chains'
import { QueryClientProvider, QueryClient }                  from '@tanstack/react-query'
import { useMemo }                                           from 'react'

// LlamaRPC as primary (reliable, no key needed) — env vars override in production
const config = getDefaultConfig({
  appName:   'Nexus Swap',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains:    [mainnet, polygon, arbitrum, optimism, base],
  ssr:       true,
  transports: {
    [mainnet.id]:  http(process.env.NEXT_PUBLIC_ETHEREUM_RPC  ?? 'https://eth.llamarpc.com'),
    [polygon.id]:  http(process.env.NEXT_PUBLIC_POLYGON_RPC   ?? 'https://polygon.llamarpc.com'),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC  ?? 'https://arbitrum.llamarpc.com'),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC  ?? 'https://optimism.llamarpc.com'),
    [base.id]:     http(process.env.NEXT_PUBLIC_BASE_RPC      ?? 'https://base.llamarpc.com'),
  },
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: 2,
      },
    },
  }), [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor:           '#22c55e',
            accentColorForeground: 'black',
            borderRadius:          'medium',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
