'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider }                                     from 'wagmi'
import { http }                                              from 'wagmi'
import { polygon, mainnet, arbitrum, optimism, base }        from 'wagmi/chains'
import { QueryClientProvider, QueryClient }                  from '@tanstack/react-query'
import { useMemo }                                           from 'react'

const config = getDefaultConfig({
  appName:   'Nexus Swap',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains:    [mainnet, polygon, arbitrum, optimism, base],
  ssr:       true,
  transports: {
    [mainnet.id]:  http(process.env.NEXT_PUBLIC_ETHEREUM_RPC  ?? 'https://cloudflare-eth.com'),
    [polygon.id]:  http(process.env.NEXT_PUBLIC_POLYGON_RPC   ?? 'https://polygon-rpc.com'),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC  ?? 'https://arb1.arbitrum.io/rpc'),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC  ?? 'https://mainnet.optimism.io'),
    [base.id]:     http(process.env.NEXT_PUBLIC_BASE_RPC      ?? 'https://mainnet.base.org'),
  },
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), [])

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
