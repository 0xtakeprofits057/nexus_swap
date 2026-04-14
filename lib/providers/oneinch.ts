// 1inch Aggregation Protocol v6
// Fee: `fee` param (percent, e.g. 0.3) + `referrer` → deducted from toAmount, sent to referrer
// Docs: https://portal.1inch.dev/documentation/swap/swagger
// API key: portal.1inch.dev (free tier available)

import { FEE_PERCENTAGE, TREASURY_ADDRESS } from '@/lib/constants'
import type { SwapQuoteParams, PriceResult, SwapQuoteResult } from './types'

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPPORTED_CHAINS: Record<number, boolean> = {
  1: true, 137: true, 42161: true, 10: true, 8453: true,
}

// 1inch takes fee in percent string: 0.003 * 100 → "0.30"
const FEE_PERCENT_STR = (FEE_PERCENTAGE * 100).toFixed(2)

function getBase(chainId: number): string {
  if (!SUPPORTED_CHAINS[chainId]) throw new Error(`1inch: chain ${chainId} not supported`)
  return `https://api.1inch.dev/swap/v6.0/${chainId}`
}

function getHeaders(): HeadersInit {
  const key = process.env.ONEINCH_API_KEY
  if (!key) throw new Error('ONEINCH_API_KEY_MISSING')   // caught silently by aggregator
  return { Authorization: `Bearer ${key}`, Accept: 'application/json' }
}

// ─── Indicative price ─────────────────────────────────────────────────────────

export async function getOneInchPrice(
  params: SwapQuoteParams,
): Promise<PriceResult & { providerName: string; supportsFee: true }> {
  const base = getBase(params.chainId)

  const query = new URLSearchParams({
    src:    params.sellToken,
    dst:    params.buyToken,
    amount: params.sellAmount.toString(),
    fee:    FEE_PERCENT_STR,
  })

  const res = await fetch(`${base}/quote?${query}`, { headers: getHeaders() })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err?.description ?? err?.error ?? `1inch error: ${res.status}`) as string
    if (
      res.status === 400 &&
      (msg.toLowerCase().includes('cannot estimate') ||
        msg.toLowerCase().includes('insufficient liquidity') ||
        msg.toLowerCase().includes('no route') ||
        msg.toLowerCase().includes('not found'))
    ) throw new Error('NO_LIQUIDITY')
    throw new Error(msg)
  }

  const data     = await res.json()
  const toAmount = BigInt(data.toAmount ?? '0')

  return {
    providerName: '1inch',
    supportsFee:  true,
    buyAmount:    toAmount,
    price:        params.sellAmount > 0n
      ? (Number(toAmount) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas: BigInt(data.gas ?? '0'),
    priceImpact:  0,   // quote endpoint doesn't expose price impact
    sources:      flattenProtocols(data.protocols),
  }
}

// ─── Firm quote ───────────────────────────────────────────────────────────────

export async function getOneInchQuote(
  params: SwapQuoteParams,
): Promise<SwapQuoteResult & { providerName: string; supportsFee: true }> {
  const base = getBase(params.chainId)

  const query = new URLSearchParams({
    src:              params.sellToken,
    dst:              params.buyToken,
    amount:           params.sellAmount.toString(),
    from:             params.taker,
    fee:              FEE_PERCENT_STR,
    referrer:         TREASURY_ADDRESS,
    slippage:         ((params.slippageBps ?? 50) / 100).toFixed(2),
    disableEstimate:  'false',
    allowPartialFill: 'false',
  })

  const res = await fetch(`${base}/swap?${query}`, { headers: getHeaders() })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err?.description ?? err?.error ?? `1inch swap error: ${res.status}`) as string
    if (
      res.status === 400 &&
      (msg.toLowerCase().includes('cannot estimate') ||
        msg.toLowerCase().includes('insufficient liquidity'))
    ) throw new Error('NO_LIQUIDITY')
    throw new Error(msg)
  }

  const data     = await res.json()
  const tx       = data.tx
  const toAmount = BigInt(data.toAmount ?? '0')

  return {
    providerName: '1inch',
    supportsFee:  true,
    buyAmount:    toAmount,
    sellAmount:   params.sellAmount,
    price:        params.sellAmount > 0n
      ? (Number(toAmount) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas: BigInt(tx?.gas ?? '0'),
    priceImpact:  0,
    route:        '1inch Aggregation Protocol',
    sources:      flattenProtocols(data.protocols),
    transaction: {
      to:    tx.to   as `0x${string}`,
      data:  tx.data as `0x${string}`,
      value: BigInt(tx.value ?? '0'),
      gas:   BigInt(tx.gas   ?? '0'),
    },
    permit2: undefined,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 1inch protocols shape: [[[{ name, part, fromTokenAddress, toTokenAddress }]]]
function flattenProtocols(protocols: unknown): { name: string; proportion: string }[] {
  if (!Array.isArray(protocols)) return []
  const flat = (protocols as unknown[][][]).flat(2) as { name?: string; part?: number }[]
  const map  = new Map<string, number>()
  for (const p of flat) {
    if (p?.name) map.set(p.name, (map.get(p.name) ?? 0) + (p.part ?? 0))
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, part]) => ({ name, proportion: (part / total).toFixed(2) }))
}
