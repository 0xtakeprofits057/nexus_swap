// ─── Shared types for the SwapProvider interface ──────────────────────────────

export interface Token {
  address:   `0x${string}`
  symbol:    string
  name:      string
  decimals:  number
  chainId:   number
  logoURI?:  string
  category:  'local-stable' | 'usd-stable' | 'major' | 'other'
  currency?: string  // "BRL", "MXN", "EUR" — for local stablecoins
}

export interface SwapQuoteParams {
  sellToken:   `0x${string}`
  buyToken:    `0x${string}`
  sellAmount:  bigint
  chainId:     number
  taker:       `0x${string}`
  slippageBps?: number
}

export interface SwapQuoteResult {
  buyAmount:       bigint
  sellAmount:      bigint
  price:           string     // buyToken per sellToken
  estimatedGas:    bigint
  priceImpact:     number     // as decimal, e.g. 0.001 = 0.1%
  route:           string     // human-readable e.g. "USDC → WMATIC → BRLA"
  sources:         { name: string; proportion: string }[]
  // Raw transaction for execution
  transaction: {
    to:    `0x${string}`
    data:  `0x${string}`
    value: bigint
    gas:   bigint
  }
  // Permit2 EIP-712 data to sign (null if not needed)
  permit2?: {
    eip712: {
      domain:      Record<string, unknown>
      types:       Record<string, unknown>
      message:     Record<string, unknown>
      primaryType: string
    }
  }
}

export interface PriceResult {
  buyAmount:     bigint
  price:         string
  estimatedGas:  bigint
  priceImpact:   number
  sources:       { name: string; proportion: string }[]
  // Set by aggregator layer
  providerName?:  string
  routerAddress?: `0x${string}`
}
