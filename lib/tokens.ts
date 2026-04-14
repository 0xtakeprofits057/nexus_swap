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
  137:   [
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
    '0xe6a537a407488807f0bbeb0038b79004f19dddfb', // BRLA
  ],
  1:     [
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0xE111178A87A3BFf0c8d18DECBa5798827539Ae99', // EURS
  ],
  42161: [
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e (fallback)
  ],
}
