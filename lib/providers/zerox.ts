import { ZRX_BASE_URLS, FEE_PERCENTAGE, TREASURY_ADDRESS } from '@/lib/constants'
import type { SwapQuoteParams, SwapQuoteResult, PriceResult } from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseUrl(chainId: number): string {
  const url = ZRX_BASE_URLS[chainId]
  if (!url) throw new Error(`Chain ${chainId} not supported by 0x`)
  return url
}

const ZRX_HEADERS = {
  '0x-api-key': process.env.ZRX_API_KEY!,
  '0x-version': 'v2',
  'Content-Type': 'application/json',
}

// ─── Indicative price (for UI display — called often) ─────────────────────────

export async function getPrice(params: SwapQuoteParams): Promise<PriceResult> {
  const baseUrl = getBaseUrl(params.chainId)

  const query = new URLSearchParams({
    sellToken:              params.sellToken,
    buyToken:               params.buyToken,
    sellAmount:             params.sellAmount.toString(),
    taker:                  params.taker,
    buyTokenPercentageFee:  FEE_PERCENTAGE.toString(),
    feeRecipient:           TREASURY_ADDRESS,
    ...(params.slippageBps ? { slippageBps: params.slippageBps.toString() } : {}),
  })

  const res = await fetch(`${baseUrl}/swap/permit2/price?${query}`, {
    headers: ZRX_HEADERS,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.validationErrors?.[0]?.reason ?? `0x price error: ${res.status}`)
  }

  const data = await res.json()

  return {
    buyAmount:    BigInt(data.buyAmount ?? '0'),
    price:        data.price ?? '0',
    estimatedGas: BigInt(data.estimatedGas ?? '0'),
    priceImpact:  parseFloat(data.estimatedPriceImpact ?? '0') / 100,
    sources:      data.sources ?? [],
  }
}

// ─── Firm quote (for execution — called once on Swap click) ──────────────────

export async function getQuote(params: SwapQuoteParams): Promise<SwapQuoteResult> {
  const baseUrl = getBaseUrl(params.chainId)

  const query = new URLSearchParams({
    sellToken:              params.sellToken,
    buyToken:               params.buyToken,
    sellAmount:             params.sellAmount.toString(),
    taker:                  params.taker,
    buyTokenPercentageFee:  FEE_PERCENTAGE.toString(),
    feeRecipient:           TREASURY_ADDRESS,
    ...(params.slippageBps ? { slippageBps: params.slippageBps.toString() } : {}),
  })

  const res = await fetch(`${baseUrl}/swap/permit2/quote?${query}`, {
    headers: ZRX_HEADERS,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.validationErrors?.[0]?.reason ?? `0x quote error: ${res.status}`)
  }

  const data = await res.json()

  // Build a human-readable route string
  const route = (data.sources as { name: string; proportion: string }[])
    ?.filter((s) => parseFloat(s.proportion) > 0)
    .map((s) => s.name)
    .join(' + ') ?? 'Direct'

  return {
    buyAmount:    BigInt(data.buyAmount ?? '0'),
    sellAmount:   BigInt(data.sellAmount ?? '0'),
    price:        data.price ?? '0',
    estimatedGas: BigInt(data.transaction?.gas ?? '0'),
    priceImpact:  parseFloat(data.estimatedPriceImpact ?? '0') / 100,
    route,
    sources:      data.sources ?? [],
    transaction: {
      to:    data.transaction.to    as `0x${string}`,
      data:  data.transaction.data  as `0x${string}`,
      value: BigInt(data.transaction.value ?? '0'),
      gas:   BigInt(data.transaction.gas ?? '0'),
    },
    permit2: data.permit2 ?? undefined,
  }
}
