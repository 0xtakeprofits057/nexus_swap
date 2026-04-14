// Li.Fi — aggregator of aggregators + bridge
// No integrator fee without portal registration → treated as no-fee fallback
// Valuable because it covers DEXs that other aggregators miss (e.g. Maverick, Integral)
// Docs: https://docs.li.fi/li.fi-api/li.fi-api

import type { SwapQuoteParams, PriceResult, SwapQuoteResult } from './types'

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE       = 'https://li.quest/v1'
const INTEGRATOR = 'nexus-swap'   // identifier only — no fee without portal setup

const SUPPORTED_CHAINS: Record<number, boolean> = {
  1: true, 137: true, 42161: true, 10: true, 8453: true,
}

function assertChain(chainId: number) {
  if (!SUPPORTED_CHAINS[chainId]) throw new Error(`LiFi: chain ${chainId} not supported`)
}

// ─── Indicative price ─────────────────────────────────────────────────────────

export async function getLiFiPrice(
  params: SwapQuoteParams,
): Promise<PriceResult & { providerName: string; supportsFee: false }> {
  assertChain(params.chainId)

  const query = new URLSearchParams({
    fromChain:    params.chainId.toString(),
    toChain:      params.chainId.toString(),    // same-chain swap only
    fromToken:    params.sellToken,
    toToken:      params.buyToken,
    fromAmount:   params.sellAmount.toString(),
    fromAddress:  params.taker,
    integrator:   INTEGRATOR,
    slippage:     ((params.slippageBps ?? 50) / 10000).toString(),
  })

  const res = await fetch(`${BASE}/quote?${query}`, {
    headers: { 'x-lifi-api-key': process.env.LIFI_API_KEY ?? '' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err?.message ?? `LiFi error: ${res.status}`) as string
    if (
      res.status === 400 &&
      (msg.toLowerCase().includes('no route') ||
        msg.toLowerCase().includes('no quotes') ||
        msg.toLowerCase().includes('not supported'))
    ) throw new Error('NO_LIQUIDITY')
    throw new Error(msg)
  }

  const data      = await res.json()
  const estimate  = data.estimate
  const toAmount  = BigInt(estimate?.toAmount ?? '0')

  if (toAmount === 0n) throw new Error('NO_LIQUIDITY')

  return {
    providerName: 'LiFi',
    supportsFee:  false,
    buyAmount:    toAmount,
    price:        params.sellAmount > 0n
      ? (Number(toAmount) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas: BigInt(estimate?.gasCosts?.[0]?.estimate ?? '0'),
    priceImpact:  Math.abs(parseFloat(estimate?.priceImpact ?? '0')),
    sources:      buildSources(estimate?.toolDetails?.name ?? 'LiFi'),
  }
}

// ─── Firm quote ───────────────────────────────────────────────────────────────

export async function getLiFiQuote(
  params: SwapQuoteParams,
): Promise<SwapQuoteResult & { providerName: string; supportsFee: false }> {
  assertChain(params.chainId)

  const query = new URLSearchParams({
    fromChain:    params.chainId.toString(),
    toChain:      params.chainId.toString(),
    fromToken:    params.sellToken,
    toToken:      params.buyToken,
    fromAmount:   params.sellAmount.toString(),
    fromAddress:  params.taker,
    integrator:   INTEGRATOR,
    slippage:     ((params.slippageBps ?? 50) / 10000).toString(),
  })

  const res = await fetch(`${BASE}/quote?${query}`, {
    headers: { 'x-lifi-api-key': process.env.LIFI_API_KEY ?? '' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? `LiFi quote error: ${res.status}`)
  }

  const data      = await res.json()
  const estimate  = data.estimate
  const tx        = data.transactionRequest
  const toAmount  = BigInt(estimate?.toAmount ?? '0')

  if (!tx?.to || !tx?.data) throw new Error('LiFi: no transaction data in response')

  return {
    providerName: 'LiFi',
    supportsFee:  false,
    buyAmount:    toAmount,
    sellAmount:   params.sellAmount,
    price:        params.sellAmount > 0n
      ? (Number(toAmount) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas: BigInt(estimate?.gasCosts?.[0]?.estimate ?? tx.gasLimit ?? '0'),
    priceImpact:  Math.abs(parseFloat(estimate?.priceImpact ?? '0')),
    route:        `LiFi via ${estimate?.toolDetails?.name ?? 'aggregator'}`,
    sources:      buildSources(estimate?.toolDetails?.name ?? 'LiFi'),
    transaction: {
      to:    tx.to   as `0x${string}`,
      data:  tx.data as `0x${string}`,
      value: BigInt(tx.value ?? '0'),
      gas:   BigInt(tx.gasLimit ?? '300000'),
    },
    permit2: undefined,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSources(toolName: string): { name: string; proportion: string }[] {
  return [{ name: toolName, proportion: '1' }]
}
