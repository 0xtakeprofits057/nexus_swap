'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider }                                     from 'wagmi'
import { http }                                              from 'wagmi'
import { polygon, mainnet, arbitrum, optimism, base, celo } from 'wagmi/chains'
import { QueryClientProvider, QueryClient }                  from '@tanstack/react-query'
import { useMemo }                                           from 'react'

const config = getDefaultConfig({
  appName:   'Nexus Swap',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains:    [polygon, mainnet, arbitrum, optimism, base, celo],
  ssr:       true,
  transports: {
    [mainnet.id]:  http(process.env.NEXT_PUBLIC_ETHEREUM_RPC  ?? 'https://eth.llamarpc.com'),
    [polygon.id]:  http(process.env.NEXT_PUBLIC_POLYGON_RPC   ?? 'https://polygon.llamarpc.com'),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC  ?? 'https://arbitrum.llamarpc.com'),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC  ?? 'https://optimism.llamarpc.com'),
    [base.id]:     http(process.env.NEXT_PUBLIC_BASE_RPC      ?? 'https://base.llamarpc.com'),
    [celo.id]:     http(process.env.NEXT_PUBLIC_CELO_RPC      ?? 'https://forno.celo.org'),
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
