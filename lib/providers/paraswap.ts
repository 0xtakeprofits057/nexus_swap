// Paraswap v5 — free API, no key required
// Fee: partnerFeeBps (30 = 0.3%) taken from destAmount, sent to partnerAddress (treasury)
// IMPORTANT: /prices returns GROSS destAmount before fee; we normalise to NET for comparison
// Docs: https://developers.paraswap.network/

import { TREASURY_ADDRESS } from '@/lib/constants'
import type { SwapQuoteParams, PriceResult, SwapQuoteResult } from './types'

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE             = 'https://apiv5.paraswap.io'
const PARTNER          = 'nexus-swap'
const PARTNER_FEE_BPS  = 30          // 0.3% in basis points

const SUPPORTED_CHAINS: Record<number, boolean> = {
  1: true, 137: true, 42161: true, 10: true, 8453: true,
}

function assertChain(chainId: number) {
  if (!SUPPORTED_CHAINS[chainId]) throw new Error(`Paraswap: chain ${chainId} not supported`)
}

// Paraswap returns gross destAmount; subtract our fee to get what the user actually receives
function netAmount(gross: bigint): bigint {
  return gross * BigInt(10000 - PARTNER_FEE_BPS) / 10000n
}

// ─── Indicative price ─────────────────────────────────────────────────────────

export async function getParaswapPrice(
  params: SwapQuoteParams,
): Promise<PriceResult & { providerName: string; supportsFee: true }> {
  assertChain(params.chainId)

  const query = new URLSearchParams({
    srcToken:      params.sellToken,
    destToken:     params.buyToken,
    amount:        params.sellAmount.toString(),
    srcDecimals:   (params.srcDecimals  ?? 18).toString(),
    destDecimals:  (params.destDecimals ?? 18).toString(),
    network:       params.chainId.toString(),
    partner:       PARTNER,
    partnerFeeBps: PARTNER_FEE_BPS.toString(),
  })

  const res = await fetch(`${BASE}/prices?${query}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err?.error ?? `Paraswap error: ${res.status}`) as string
    if (
      res.status === 400 &&
      (msg.toLowerCase().includes('no route') ||
        msg.toLowerCase().includes('no liquidity') ||
        msg.toLowerCase().includes('too low') ||
        msg.toLowerCase().includes('not found'))
    ) throw new Error('NO_LIQUIDITY')
    throw new Error(msg)
  }

  const data  = await res.json()
  const route = data.priceRoute

  if (!route?.destAmount || BigInt(route.destAmount) === 0n) {
    throw new Error('NO_LIQUIDITY')
  }

  const gross = BigInt(route.destAmount)
  const net   = netAmount(gross)

  return {
    providerName: 'Paraswap',
    supportsFee:  true,
    buyAmount:    net,
    price:        params.sellAmount > 0n
      ? (Number(net) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas: BigInt(route.gasCost ?? '0'),
    priceImpact:  Math.abs(parseFloat(route.priceImpact ?? '0')) / 100,
    sources:      buildSources(route.bestRoute),
  }
}

// ─── Firm quote ───────────────────────────────────────────────────────────────

export async function getParaswapQuote(
  params: SwapQuoteParams,
): Promise<SwapQuoteResult & { providerName: string; supportsFee: true }> {
  assertChain(params.chainId)

  // Step 1 — fresh price route (required by Paraswap tx endpoint)
  const priceQuery = new URLSearchParams({
    srcToken:      params.sellToken,
    destToken:     params.buyToken,
    amount:        params.sellAmount.toString(),
    srcDecimals:   (params.srcDecimals  ?? 18).toString(),
    destDecimals:  (params.destDecimals ?? 18).toString(),
    network:       params.chainId.toString(),
    partner:       PARTNER,
    partnerFeeBps: PARTNER_FEE_BPS.toString(),
  })

  const priceRes = await fetch(`${BASE}/prices?${priceQuery}`)
  if (!priceRes.ok) throw new Error(`Paraswap price error: ${priceRes.status}`)
  const priceData = await priceRes.json()
  const priceRoute = priceData.priceRoute
  if (!priceRoute?.destAmount) throw new Error('NO_LIQUIDITY')

  const gross = BigInt(priceRoute.destAmount)
  const net   = netAmount(gross)

  // Step 2 — build transaction
  const txRes = await fetch(
    `${BASE}/transactions/${params.chainId}?ignoreChecks=true`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        srcToken:       params.sellToken,
        destToken:      params.buyToken,
        srcAmount:      params.sellAmount.toString(),
        // Do NOT send destAmount alongside slippage — Paraswap rejects both together.
        // slippage (in bps) covers min-output protection instead.
        priceRoute,
        userAddress:    params.taker,
        partner:        PARTNER,
        partnerFeeBps:  PARTNER_FEE_BPS,
        partnerAddress: TREASURY_ADDRESS,
        slippage:       params.slippageBps ?? 50,
      }),
    },
  )

  if (!txRes.ok) {
    const err = await txRes.json().catch(() => ({}))
    throw new Error(err?.error ?? `Paraswap tx build error: ${txRes.status}`)
  }

  const txJson = await txRes.json()
  // Paraswap wraps in `data` in some responses
  const tx = txJson.data ?? txJson

  return {
    providerName: 'Paraswap',
    supportsFee:  true,
    buyAmount:    net,
    sellAmount:   params.sellAmount,
    price:        params.sellAmount > 0n
      ? (Number(net) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas: BigInt(priceRoute.gasCost ?? '0'),
    priceImpact:  Math.abs(parseFloat(priceRoute.priceImpact ?? '0')) / 100,
    route:        'Paraswap Aggregator',
    sources:      buildSources(priceRoute.bestRoute),
    transaction: {
      to:    tx.to   as `0x${string}`,
      data:  tx.data as `0x${string}`,
      value: BigInt(tx.value ?? '0'),
      gas:   BigInt(priceRoute.gasCost ?? tx.gas ?? '200000'),
    },
    permit2: undefined,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSources(bestRoute: unknown): { name: string; proportion: string }[] {
  if (!Array.isArray(bestRoute)) return [{ name: 'Paraswap', proportion: '1' }]
  const seen = new Map<string, number>()
  for (const leg of bestRoute as { swaps?: { swapExchanges?: { exchange?: string; percent?: string }[] }[] }[]) {
    for (const swap of (leg.swaps ?? [])) {
      for (const ex of (swap.swapExchanges ?? [])) {
        const name = ex.exchange ?? 'Unknown'
        seen.set(name, (seen.get(name) ?? 0) + parseFloat(ex.percent ?? '0'))
      }
    }
  }
  if (seen.size === 0) return [{ name: 'Paraswap', proportion: '1' }]
  const total = [...seen.values()].reduce((a, b) => a + b, 0) || 1
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, pct]) => ({ name, proportion: (pct / total).toFixed(2) }))
}
