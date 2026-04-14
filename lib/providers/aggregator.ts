// Multi-provider aggregator — LlamaSwap style
//
// Fee-capturing providers (Priority 1):  0x, 1inch, Paraswap, OpenOcean
// No-fee fallback providers (Priority 2): Odos, KyberSwap, LiFi
//
// Strategy:
//   getBestPrice → query all 7 in parallel (5s timeout each)
//                → pick best among fee-capturing providers first
//                → fall back to no-fee providers only if ALL fee providers fail
//   getBestQuote → route to the winning provider for a firm executable quote

import { getPrice        as getZeroXPrice,    getQuote  as getZeroXQuote    } from './zerox'
import { getOdosPrice,      getOdosQuote                                     } from './odos'
import { getKyberPrice,     getKyberQuote                                    } from './kyberswap'
import { getOneInchPrice,   getOneInchQuote                                  } from './oneinch'
import { getParaswapPrice,  getParaswapQuote                                 } from './paraswap'
import { getOpenOceanPrice, getOpenOceanQuote                                } from './openocean'
import { getLiFiPrice,      getLiFiQuote                                     } from './lifi'
import type { SwapQuoteParams, PriceResult, SwapQuoteResult }                  from './types'

// ─── Extended types ───────────────────────────────────────────────────────────

export interface ProviderPriceResult extends PriceResult {
  providerName:   string
  supportsFee:    boolean
  routerAddress?: `0x${string}`
}

export interface BestPriceResult extends ProviderPriceResult {
  allQuotes: ProviderPriceResult[]
}

export type BestQuoteResult = SwapQuoteResult & {
  providerName:   string
  supportsFee:    boolean
  routerAddress?: `0x${string}`
}

// ─── Timeout wrapper ──────────────────────────────────────────────────────────

const PROVIDER_TIMEOUT_MS = 6_000

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: timeout`)), PROVIDER_TIMEOUT_MS),
    ),
  ])
}

// ─── Price aggregation ────────────────────────────────────────────────────────

export async function getBestPrice(params: SwapQuoteParams): Promise<BestPriceResult> {
  type Job = Promise<ProviderPriceResult>

  // Fee-capturing: 0x, 1inch, Paraswap, OpenOcean
  const feeJobs: Job[] = [
    withTimeout(
      getZeroXPrice(params).then(r => ({ ...r, providerName: r.providerName ?? '0x', supportsFee: true })),
      '0x',
    ),
    withTimeout(getOneInchPrice(params), '1inch'),
    withTimeout(getParaswapPrice(params), 'Paraswap'),
    withTimeout(getOpenOceanPrice(params), 'OpenOcean'),
  ]

  // No-fee fallback: Odos, KyberSwap, LiFi
  const fallbackJobs: Job[] = [
    withTimeout(
      getOdosPrice(params).then(r => ({ ...r, supportsFee: false as const })),
      'Odos',
    ),
    withTimeout(
      getKyberPrice(params).then(r => ({ ...r, supportsFee: false as const })),
      'KyberSwap',
    ),
    withTimeout(getLiFiPrice(params), 'LiFi'),
  ]

  // Run all in parallel
  const [feeSettled, fallbackSettled] = await Promise.all([
    Promise.allSettled(feeJobs),
    Promise.allSettled(fallbackJobs),
  ])

  const feeSuccesses      = collect(feeSettled)
  const fallbackSuccesses = collect(fallbackSettled)
  const allSuccesses      = [...feeSuccesses, ...fallbackSuccesses]

  if (allSuccesses.length === 0) throw new Error('NO_LIQUIDITY')

  // Always pick best from fee-capturing providers if any succeeded
  const candidates = feeSuccesses.length > 0 ? feeSuccesses : fallbackSuccesses
  const best       = candidates.reduce((a, b) => (a.buyAmount >= b.buyAmount ? a : b))

  return { ...best, allQuotes: allSuccesses }
}

// ─── Firm quote ───────────────────────────────────────────────────────────────

export async function getBestQuote(
  params:            SwapQuoteParams,
  preferredProvider?: string,
): Promise<BestQuoteResult> {
  const provider = preferredProvider ?? '0x'

  switch (provider) {
    case '1inch':
      return { ...await getOneInchQuote(params),   supportsFee: true  }
    case 'Paraswap':
      return { ...await getParaswapQuote(params),  supportsFee: true  }
    case 'OpenOcean':
      return { ...await getOpenOceanQuote(params), supportsFee: true  }
    case 'Odos':
      return { ...await getOdosQuote(params),      supportsFee: false }
    case 'KyberSwap':
      return { ...await getKyberQuote(params),     supportsFee: false }
    case 'LiFi':
      return { ...await getLiFiQuote(params),      supportsFee: false }
    case '0x':
    default:
      return { ...await getZeroXQuote(params), providerName: '0x', supportsFee: true }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collect<T>(settled: PromiseSettledResult<T>[]): T[] {
  const results: T[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      results.push(r.value)
    } else {
      // Silently skip expected errors; log unexpected ones
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason)
      if (
        msg !== 'NO_LIQUIDITY' &&
        msg !== 'ONEINCH_API_KEY_MISSING' &&
        !msg.endsWith(': timeout')
      ) {
        console.warn('[aggregator] provider error:', msg)
      }
    }
  }
  return results
}
