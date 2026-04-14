// ─── Fee config ───────────────────────────────────────────────────────────────
export const FEE_PERCENTAGE = parseFloat(process.env.FEE_PERCENTAGE ?? '0.003') // 0.3%
export const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS as `0x${string}`

// ─── Permit2 (same address on all EVM chains) ─────────────────────────────────
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const

// ─── Native token sentinel address (ETH, POL, etc.) ──────────────────────────
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const

// ─── Slippage defaults (in basis points) ─────────────────────────────────────
export const SLIPPAGE_SAME_PEG  = 10   // 0.1%  stable↔stable same currency
export const SLIPPAGE_CROSS_PEG = 50   // 0.5%  stable↔stable cross-currency
export const SLIPPAGE_VOLATILE  = 100  // 1.0%  anything involving a volatile

// ─── Quote refresh interval ───────────────────────────────────────────────────
export const QUOTE_STALE_MS     = 10_000  // 10s before quote is considered stale
export const QUOTE_REFETCH_MS   = 15_000  // refetch interval when focused

// ─── 0x API ───────────────────────────────────────────────────────────────────
export const ZRX_BASE_URLS: Record<number, string> = {
  1:     'https://api.0x.org',
  137:   'https://polygon.api.0x.org',
  42161: 'https://arbitrum.api.0x.org',
  10:    'https://optimism.api.0x.org',
  8453:  'https://base.api.0x.org',
  42220: 'https://celo.api.0x.org',
}
