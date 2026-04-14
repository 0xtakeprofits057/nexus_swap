// KyberSwap Aggregator — free API, no key required
// Strong coverage across Polygon, Arbitrum, and Base
// Docs: https://docs.kyberswap.com/kyberswap-solutions/kyberswap-aggregator/developer-guides

import type { SwapQuoteParams, PriceResult, SwapQuoteResult } from './types'

const CHAIN_SLUGS: Record<number, string> = {
  1:     'ethereum',
  137:   'polygon',
  42161: 'arbitrum',
  10:    'optimism',
  8453:  'base',
  42220: 'celo',
}

// KyberSwap MetaAggregationRouter v2 (lowercase — normalized to EIP-55 checksum at call time)
export const KYBER_ROUTERS: Record<number, `0x${string}`> = {
  1:     '0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
  137:   '0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
  42161: '0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
  10:    '0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
  8453:  '0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
  42220: '0x6131b5fae19ea4f9d964eac0408e4408b66337b5',
}

export function getKyberRouter(chainId: number): `0x${string}` | undefined {
  return KYBER_ROUTERS[chainId]
}

function getBase(chainId: number): string {
  const slug = CHAIN_SLUGS[chainId]
  if (!slug) throw new Error(`KyberSwap: chain ${chainId} not supported`)
  return `https://aggregator-api.kyberswap.com/${slug}/api/v1`
}

const KYBER_HEADERS = { 'x-client-id': 'nexus-swap' }

// ── Indicative price (fast, for UI display) ───────────────────────────────────

export async function getKyberPrice(
  params: SwapQuoteParams,
): Promise<PriceResult & { providerName: string; routerAddress?: `0x${string}`; _routeSummary?: unknown }> {
  const base   = getBase(params.chainId)
  const router = KYBER_ROUTERS[params.chainId]

  const res = await fetch(
    `${base}/routes?${new URLSearchParams({
      tokenIn:    params.sellToken,
      tokenOut:   params.buyToken,
      amountIn:   params.sellAmount.toString(),
      gasInclude: 'true',
    })}`,
    { headers: KYBER_HEADERS },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? `KyberSwap error: ${res.status}`)
  }

  const data = await res.json()
  const summary = data.data?.routeSummary

  if (!summary || !summary.amountOut || BigInt(summary.amountOut) === 0n) {
    throw new Error('NO_LIQUIDITY')
  }

  const outAmount = BigInt(summary.amountOut)

  return {
    providerName:   'KyberSwap',
    supportsFee:    false,
    routerAddress:  router,
    _routeSummary:  summary,         // passed through for firm quote step
    buyAmount:      outAmount,
    price:          params.sellAmount > 0n
      ? (Number(outAmount) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas:   BigInt(summary.gas ?? '0'),
    priceImpact:    Math.abs(parseFloat(summary.priceImpact ?? '0')) / 100,
    sources:        [{ name: 'KyberSwap', proportion: '1' }],
  }
}

// ── Firm quote (for execution — called once on swap click) ────────────────────

export async function getKyberQuote(
  params: SwapQuoteParams,
): Promise<SwapQuoteResult & { providerName: string; supportsFee: false; routerAddress: `0x${string}` }> {
  const base   = getBase(params.chainId)
  const router = KYBER_ROUTERS[params.chainId]

  // Step 1: get route summary
  const routeRes = await fetch(
    `${base}/routes?${new URLSearchParams({
      tokenIn:    params.sellToken,
      tokenOut:   params.buyToken,
      amountIn:   params.sellAmount.toString(),
      gasInclude: 'true',
    })}`,
    { headers: KYBER_HEADERS },
  )
  if (!routeRes.ok) throw new Error(`KyberSwap routes error: ${routeRes.status}`)
  const routeData = await routeRes.json()
  const summary   = routeData.data?.routeSummary
  if (!summary) throw new Error('NO_LIQUIDITY')

  // Step 2: build transaction
  const buildRes = await fetch(`${base}/route/build`, {
    method:  'POST',
    headers: { ...KYBER_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routeSummary:      summary,
      sender:            params.taker,
      recipient:         params.taker,
      slippageTolerance: params.slippageBps ?? 50,  // bps
    }),
  })
  if (!buildRes.ok) {
    const err = await buildRes.json().catch(() => ({}))
    throw new Error(err?.message ?? `KyberSwap build error: ${buildRes.status}`)
  }
  const built = await buildRes.json()
  const tx    = built.data

  const outAmount = BigInt(summary.amountOut ?? '0')

  return {
    providerName:  'KyberSwap',
    supportsFee:   false as const,
    routerAddress: router,
    buyAmount:     outAmount,
    sellAmount:    params.sellAmount,
    price:         params.sellAmount > 0n
      ? (Number(outAmount) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas:  BigInt(tx.gas ?? '0'),
    priceImpact:   Math.abs(parseFloat(summary.priceImpact ?? '0')) / 100,
    route:         'KyberSwap Aggregator',
    sources:       [{ name: 'KyberSwap', proportion: '1' }],
    transaction: {
      to:    (tx.routerAddress ?? router) as `0x${string}`,
      data:  tx.data  as `0x${string}`,
      value: BigInt(tx.value ?? '0'),
      gas:   BigInt(tx.gas   ?? '0'),
    },
    // KyberSwap uses standard approve, no Permit2
    permit2: undefined,
  }
}
