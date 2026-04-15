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

  // Outlier detection: if a provider returns a price >1000x the median,
  // it's almost certainly a bug (e.g. OpenOcean returning raw units instead of
  // human-readable for a less-common token). Discard such results silently.
  const sanitized = filterOutliers(allSuccesses)
  const saneSet   = sanitized.length > 0 ? sanitized : allSuccesses // never discard all

  const saneFee      = saneSet.filter((r) => r.supportsFee)
  const saneFallback = saneSet.filter((r) => !r.supportsFee)

  // Always pick best from fee-capturing providers if any survived sanity check
  const candidates = saneFee.length > 0 ? saneFee : saneFallback
  const best       = candidates.reduce((a, b) => (a.buyAmount >= b.buyAmount ? a : b))

  // allQuotes shown in UI: only the sane results so users don't see bogus prices
  return { ...best, allQuotes: saneSet }
}

// ─── Firm quote ───────────────────────────────────────────────────────────────

export async function getBestQuote(
  params:            SwapQuoteParams,
  preferredProvider?: string,
): Promise<BestQuoteResult> {
  // Try providers in order: preferred first, then fallbacks
  // This ensures users always get a working swap even when one provider fails
  const preferred = preferredProvider ?? '0x'
  const fallbackOrder = ['Odos', 'KyberSwap', '0x', '1inch', 'Paraswap', 'OpenOcean', 'LiFi']
  const order = [preferred, ...fallbackOrder.filter((p) => p !== preferred)]

  let lastError: Error | undefined

  for (const provider of order) {
    try {
      const result = await quoteFromProvider(provider, params)
      if (provider !== preferred) {
        console.info(`[aggregator] firm quote: fell back from ${preferred} to ${provider}`)
      }
      return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[aggregator] firm quote failed for ${provider}:`, lastError.message)
    }
  }

  throw lastError ?? new Error('All providers failed to return a firm quote')
}

async function quoteFromProvider(provider: string, params: SwapQuoteParams): Promise<BestQuoteResult> {
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

// ─── Outlier filter ───────────────────────────────────────────────────────────

/**
 * Remove results whose buyAmount is more than OUTLIER_RATIO × the median.
 * This catches providers that return raw-unit amounts instead of human-readable
 * (e.g. OpenOcean occasionally returning 843,312 EURC when the real answer is 0.847).
 * A 1000× deviation from the median is impossible in any real market.
 */
const OUTLIER_RATIO = 1_000n

function filterOutliers(results: ProviderPriceResult[]): ProviderPriceResult[] {
  if (results.length <= 1) return results

  const amounts = results.map((r) => r.buyAmount).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const mid     = Math.floor(amounts.length / 2)
  const median  = amounts[mid]

  if (median === 0n) return results  // can't compute ratio safely

  return results.filter((r) => {
    const ratio = r.buyAmount > median
      ? r.buyAmount / median
      : median / r.buyAmount
    if (ratio > OUTLIER_RATIO) {
      console.warn(
        `[aggregator] outlier discarded: ${r.providerName} quoted ${r.buyAmount} ` +
        `(median ${median}, ratio ${ratio}×)`,
      )
      return false
    }
    return true
  })
}

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
