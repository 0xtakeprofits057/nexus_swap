// OpenOcean v3 — free API, no key required
// Fee: `referrer` (treasury address) + `referrerFee` (percent, 0.3 = 0.3%)
// The referrerFee is deducted from outAmount during execution; /quote returns GROSS amount
// Docs: https://docs.openocean.finance/api/openocean-api-3.0

import { FEE_PERCENTAGE, TREASURY_ADDRESS } from '@/lib/constants'
import type { SwapQuoteParams, PriceResult, SwapQuoteResult } from './types'

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE = 'https://open-api.openocean.finance/v3'

// OpenOcean uses chain slugs, not IDs
const CHAIN_SLUGS: Record<number, string> = {
  1:     'eth',
  137:   'polygon',
  42161: 'arbitrum',
  10:    'optimism',
  8453:  'base',
}

// OpenOcean takes fee in percent (0.3 = 0.3%)
const REFERRER_FEE_STR = (FEE_PERCENTAGE * 100).toFixed(2)
// In bps for normalization
const FEE_BPS = Math.round(FEE_PERCENTAGE * 10000)

function getSlug(chainId: number): string {
  const slug = CHAIN_SLUGS[chainId]
  if (!slug) throw new Error(`OpenOcean: chain ${chainId} not supported`)
  return slug
}

// /quote returns gross outAmount; normalize to net for fair comparison
function netAmount(gross: bigint): bigint {
  return gross * BigInt(10000 - FEE_BPS) / 10000n
}

// ─── Indicative price ─────────────────────────────────────────────────────────

export async function getOpenOceanPrice(
  params: SwapQuoteParams,
): Promise<PriceResult & { providerName: string; supportsFee: true }> {
  const slug = getSlug(params.chainId)

  // OpenOcean /quote takes `amount` in human-readable units (not wei) — we must convert
  // To avoid needing decimals here, pass the raw amount and use inTokenDecimals
  const query = new URLSearchParams({
    inTokenAddress:  params.sellToken,
    outTokenAddress: params.buyToken,
    amount:          params.sellAmount.toString(),
    gasPrice:        '5',
    referrer:        TREASURY_ADDRESS,
    referrerFee:     REFERRER_FEE_STR,
  })

  const res = await fetch(`${BASE}/${slug}/quote?${query}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err?.message ?? err?.error ?? `OpenOcean error: ${res.status}`) as string
    if (res.status === 400 && msg.toLowerCase().includes('insufficient')) {
      throw new Error('NO_LIQUIDITY')
    }
    throw new Error(msg)
  }

  const body = await res.json()

  // OpenOcean wraps response in body.data
  if (body.code !== 200 || !body.data?.outAmount) {
    throw new Error('NO_LIQUIDITY')
  }

  const data    = body.data
  const gross   = BigInt(data.outAmount ?? '0')
  const net     = netAmount(gross)

  return {
    providerName: 'OpenOcean',
    supportsFee:  true,
    buyAmount:    net,
    price:        params.sellAmount > 0n
      ? (Number(net) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas: BigInt(data.estimatedGas ?? '0'),
    priceImpact:  Math.abs(parseFloat(data.price_impact ?? '0')) / 100,
    sources:      buildSources(data.path),
  }
}

// ─── Firm quote ───────────────────────────────────────────────────────────────

export async function getOpenOceanQuote(
  params: SwapQuoteParams,
): Promise<SwapQuoteResult & { providerName: string; supportsFee: true }> {
  const slug = getSlug(params.chainId)

  const query = new URLSearchParams({
    inTokenAddress:  params.sellToken,
    outTokenAddress: params.buyToken,
    amount:          params.sellAmount.toString(),
    gasPrice:        '5',
    account:         params.taker,
    slippage:        ((params.slippageBps ?? 50) / 100).toFixed(2),
    referrer:        TREASURY_ADDRESS,
    referrerFee:     REFERRER_FEE_STR,
  })

  const res = await fetch(`${BASE}/${slug}/swap?${query}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err?.message ?? err?.error ?? `OpenOcean swap error: ${res.status}`) as string
    throw new Error(msg)
  }

  const body = await res.json()
  if (body.code !== 200 || !body.data) {
    throw new Error(`OpenOcean swap failed: ${body.errorMsg ?? 'unknown'}`)
  }

  const data    = body.data
  const gross   = BigInt(data.outAmount ?? '0')
  const net     = netAmount(gross)
  const tx      = data

  return {
    providerName: 'OpenOcean',
    supportsFee:  true,
    buyAmount:    net,
    sellAmount:   params.sellAmount,
    price:        params.sellAmount > 0n
      ? (Number(net) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas: BigInt(data.estimatedGas ?? '0'),
    priceImpact:  Math.abs(parseFloat(data.price_impact ?? '0')) / 100,
    route:        'OpenOcean Aggregator',
    sources:      buildSources(data.path),
    transaction: {
      to:    tx.to   as `0x${string}`,
      data:  tx.data as `0x${string}`,
      value: BigInt(tx.value ?? '0'),
      gas:   BigInt(data.estimatedGas ?? '200000'),
    },
    permit2: undefined,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSources(
  path: unknown,
): { name: string; proportion: string }[] {
  if (!Array.isArray(path) || path.length === 0) {
    return [{ name: 'OpenOcean', proportion: '1' }]
  }
  // path is an array of token hops; each hop has `pools` with dex name
  const seen = new Map<string, number>()
  for (const hop of path as { pools?: { dexName?: string; proportion?: number }[] }[]) {
    for (const pool of (hop.pools ?? [])) {
      const name = pool.dexName ?? 'Unknown'
      seen.set(name, (seen.get(name) ?? 0) + (pool.proportion ?? 1))
    }
  }
  if (seen.size === 0) return [{ name: 'OpenOcean', proportion: '1' }]
  const total = [...seen.values()].reduce((a, b) => a + b, 0) || 1
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, pct]) => ({ name, proportion: (pct / total).toFixed(2) }))
}
