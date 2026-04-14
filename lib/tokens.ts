import tokenList from '@/tokens/local-stablecoins.json'
import type { Token } from '@/lib/providers/types'

export function getTokensByChain(chainId: number): Token[] {
  return tokenList.tokens.filter((t) => t.chainId === chainId) as Token[]
}

export function getLocalStables(chainId: number): Token[] {
  return getTokensByChain(chainId).filter((t) => t.category === 'local-stable')
}

export function getUsdStables(chainId: number): Token[] {
  return getTokensByChain(chainId).filter((t) => t.category === 'usd-stable')
}

export function getTokenByAddress(
  address: string,
  chainId: number
): Token | undefined {
  return getTokensByChain(chainId).find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  )
}

// Default pairs per chain: [sellToken address, buyToken address]
export const DEFAULT_PAIRS: Record<number, [string, string]> = {
  1: [
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH (native)
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  ],
  137: [
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
    '0xe6a537a407488807f0bbeb0038b79004f19dddfb', // BRLA
  ],
  42161: [
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH (native)
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
  ],
  10: [
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH (native)
    '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC
  ],
  8453: [
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH (native)
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  ],
}
