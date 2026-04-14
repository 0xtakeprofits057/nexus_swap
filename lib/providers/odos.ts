// Odos Smart Order Router — free API, no key required
// Excellent liquidity on Polygon for stable↔stable routes
// Docs: https://api.odos.xyz/swagger-ui/

import type { SwapQuoteParams, PriceResult, SwapQuoteResult } from './types'

const ODOS_BASE = 'https://api.odos.xyz'

// Odos v2 router addresses per chain (lowercase — normalized to EIP-55 checksum at call time)
export const ODOS_ROUTERS: Record<number, `0x${string}`> = {
  1:     '0xcf5540fffcdc3d510b18bfca6d2b9987b0772559',
  137:   '0x4e3288c9ca110bcc82bf38f09a7b425c095d92bb',
  42161: '0xa669e7a0d4b3e4fa48af2de86bd4cd7126be4e1',
  10:    '0xca423977156bb05b13a2ba3b76bc5419e2fe9680',
  8453:  '0x19cead7105607cd444f5ad10dd51356436095a1',
}

export function getOdosRouter(chainId: number): `0x${string}` | undefined {
  return ODOS_ROUTERS[chainId]
}

function toOdosSlippage(slippageBps?: number): number {
  // Odos uses percent (0.5 = 0.5%), we store bps (50 = 0.5%)
  return slippageBps ? slippageBps / 100 : 0.5
}

// ── Indicative price (fast, for UI display) ───────────────────────────────────

export async function getOdosPrice(
  params: SwapQuoteParams,
): Promise<PriceResult & { providerName: string; routerAddress?: `0x${string}` }> {
  const router = ODOS_ROUTERS[params.chainId]
  if (!router) throw new Error(`Odos: chain ${params.chainId} not supported`)

  const res = await fetch(`${ODOS_BASE}/sor/quote/v2`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chainId:            params.chainId,
      inputTokens:        [{ tokenAddress: params.sellToken, amount: params.sellAmount.toString() }],
      outputTokens:       [{ tokenAddress: params.buyToken,  proportion: 1 }],
      userAddr:           params.taker,
      slippageLimitPercent: toOdosSlippage(params.slippageBps),
      referralCode:       0,
      disableRFQs:        false,
      compact:            true,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.description ?? `Odos error: ${res.status}`
    if (res.status === 400 && msg.toLowerCase().includes('insufficient')) throw new Error('NO_LIQUIDITY')
    throw new Error(msg)
  }

  const data = await res.json()
  const outAmount = data.outAmounts?.[0] ?? '0'

  return {
    providerName:  'Odos',
    supportsFee:   false,
    routerAddress: router,
    buyAmount:     BigInt(outAmount),
    price:         outAmount && params.sellAmount > 0n
      ? (Number(BigInt(outAmount)) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas:  BigInt(data.gasEstimate ?? '0'),
    priceImpact:   Math.abs(parseFloat(data.priceImpact ?? '0')) / 100,
    sources:       [{ name: 'Odos', proportion: '1' }],
  }
}

// ── Firm quote (for execution — called once on swap click) ────────────────────

export async function getOdosQuote(
  params: SwapQuoteParams,
): Promise<SwapQuoteResult & { providerName: string; supportsFee: false; routerAddress: `0x${string}` }> {
  const router = ODOS_ROUTERS[params.chainId]
  if (!router) throw new Error(`Odos: chain ${params.chainId} not supported`)

  // Step 1: get pathId
  const quoteRes = await fetch(`${ODOS_BASE}/sor/quote/v2`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chainId:            params.chainId,
      inputTokens:        [{ tokenAddress: params.sellToken, amount: params.sellAmount.toString() }],
      outputTokens:       [{ tokenAddress: params.buyToken,  proportion: 1 }],
      userAddr:           params.taker,
      slippageLimitPercent: toOdosSlippage(params.slippageBps),
      referralCode:       0,
      disableRFQs:        false,
      compact:            false,
    }),
  })
  if (!quoteRes.ok) {
    const err = await quoteRes.json().catch(() => ({}))
    throw new Error(err?.description ?? `Odos quote error: ${quoteRes.status}`)
  }
  const quote = await quoteRes.json()

  // Step 2: assemble transaction
  const assembleRes = await fetch(`${ODOS_BASE}/sor/assemble`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddr: params.taker,
      pathId:   quote.pathId,
      simulate: false,
    }),
  })
  if (!assembleRes.ok) {
    const err = await assembleRes.json().catch(() => ({}))
    throw new Error(err?.description ?? `Odos assemble error: ${assembleRes.status}`)
  }
  const assembled = await assembleRes.json()
  const tx = assembled.transaction

  const outAmount = quote.outAmounts?.[0] ?? '0'

  return {
    providerName:  'Odos',
    supportsFee:   false,
    routerAddress: router,
    buyAmount:     BigInt(outAmount),
    sellAmount:    params.sellAmount,
    price:         outAmount && params.sellAmount > 0n
      ? (Number(BigInt(outAmount)) / Number(params.sellAmount)).toString()
      : '0',
    estimatedGas:  BigInt(tx.gas ?? '0'),
    priceImpact:   Math.abs(parseFloat(quote.priceImpact ?? '0')) / 100,
    route:         'Odos Smart Order Router',
    sources:       [{ name: 'Odos', proportion: '1' }],
    transaction: {
      to:    tx.to    as `0x${string}`,
      data:  tx.data  as `0x${string}`,
      value: BigInt(tx.value ?? '0'),
      gas:   BigInt(tx.gas   ?? '0'),
    },
    // Odos uses standard approve, no Permit2
    permit2: undefined,
  }
}
