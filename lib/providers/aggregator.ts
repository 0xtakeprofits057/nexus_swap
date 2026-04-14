// Multi-provider aggregator — queries 0x, Odos, and KyberSwap in parallel
// Returns the best quote (highest buyAmount) + all quotes for UI comparison

import { getPrice  as getZeroXPrice,  getQuote  as getZeroXQuote  } from './zerox'
import { getOdosPrice,  getOdosQuote  } from './odos'
import { getKyberPrice, getKyberQuote } from './kyberswap'
import type { SwapQuoteParams, PriceResult, SwapQuoteResult } from './types'

// ─── Extended types ───────────────────────────────────────────────────────────

export interface ProviderPriceResult extends PriceResult {
  providerName:  string
  routerAddress?: `0x${string}`
}

export interface BestPriceResult extends ProviderPriceResult {
  allQuotes: ProviderPriceResult[]
}

export type BestQuoteResult = SwapQuoteResult & {
  providerName:  string
  routerAddress?: `0x${string}`
}

// ─── Price aggregation (called on every keystroke — must be fast) ─────────────

export async function getBestPrice(params: SwapQuoteParams): Promise<BestPriceResult> {
  // Fire all three in parallel — slowest determines latency, not sum
  const jobs: Promise<ProviderPriceResult>[] = [
    getZeroXPrice(params).then(r => ({ ...r, providerName: '0x' })),
    getOdosPrice(params),
    getKyberPrice(params),
  ]

  const settled = await Promise.allSettled(jobs)

  // Collect successes; log failures for debugging (don't surface to user)
  const successes: ProviderPriceResult[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      successes.push(result.value)
    } else {
      // Only log unexpected errors — NO_LIQUIDITY is expected
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
      if (msg !== 'NO_LIQUIDITY') {
        console.warn('[aggregator] provider error:', msg)
      }
    }
  }

  if (successes.length === 0) throw new Error('NO_LIQUIDITY')

  // Best = highest buyAmount (most tokens out for same sellAmount)
  const best = successes.reduce((a, b) => (a.buyAmount >= b.buyAmount ? a : b))

  return { ...best, allQuotes: successes }
}

// ─── Firm quote (called once on swap click — accuracy matters more than speed) ─

export async function getBestQuote(
  params:           SwapQuoteParams,
  preferredProvider?: string,
): Promise<BestQuoteResult> {
  switch (preferredProvider) {
    case 'Odos':
      return getOdosQuote(params)
    case 'KyberSwap':
      return getKyberQuote(params)
    case '0x':
    default:
      return { ...await getZeroXQuote(params), providerName: '0x' }
  }
}
