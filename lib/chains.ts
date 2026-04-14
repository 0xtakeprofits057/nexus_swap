import { polygon, mainnet, arbitrum, optimism, base } from 'wagmi/chains'
import type { Chain } from 'wagmi/chains'

export const SUPPORTED_CHAINS: Chain[] = [polygon, mainnet, arbitrum, optimism, base]

export const DEFAULT_CHAIN = polygon

export const CHAIN_RPC_URLS: Record<number, string> = {
  1:     process.env.NEXT_PUBLIC_ETHEREUM_RPC ?? 'https://cloudflare-eth.com',
  137:   process.env.NEXT_PUBLIC_POLYGON_RPC  ?? 'https://polygon-rpc.com',
  42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC ?? 'https://arb1.arbitrum.io/rpc',
  10:    process.env.NEXT_PUBLIC_OPTIMISM_RPC ?? 'https://mainnet.optimism.io',
  8453:  process.env.NEXT_PUBLIC_BASE_RPC     ?? 'https://mainnet.base.org',
}

export const CHAIN_NAMES: Record<number, string> = {
  1:     'Ethereum',
  137:   'Polygon',
  42161: 'Arbitrum',
  10:    'Optimism',
  8453:  'Base',
}

export const CHAIN_NATIVE_TOKEN: Record<number, string> = {
  1:     'ETH',
  137:   'POL',
  42161: 'ETH',
  10:    'ETH',
  8453:  'ETH',
}

export function isSupportedChain(chainId: number): boolean {
  return SUPPORTED_CHAINS.some((c) => c.id === chainId)
}
