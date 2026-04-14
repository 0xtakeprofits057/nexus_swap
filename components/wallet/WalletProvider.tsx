'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider }                                     from 'wagmi'
import { polygon, mainnet, arbitrum, optimism, base }        from 'wagmi/chains'
import { QueryClientProvider, QueryClient }                  from '@tanstack/react-query'
import { useMemo }                                           from 'react'

const config = getDefaultConfig({
  appName:    'Nexus Swap',
  projectId:  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains:     [polygon, mainnet, arbitrum, optimism, base],
  ssr:        true,
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor:          '#22c55e',
            accentColorForeground: 'black',
            borderRadius:         'medium',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
