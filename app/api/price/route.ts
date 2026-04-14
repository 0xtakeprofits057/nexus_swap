import { NextRequest, NextResponse } from 'next/server'
import { getBestPrice }              from '@/lib/providers/aggregator'
import { getTokenByAddress }         from '@/lib/tokens'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const sellToken   = searchParams.get('sellToken')  as `0x${string}` | null
  const buyToken    = searchParams.get('buyToken')   as `0x${string}` | null
  const sellAmount  = searchParams.get('sellAmount')
  const chainId     = searchParams.get('chainId')
  const taker       = searchParams.get('taker')      as `0x${string}` | null
  const slippageBps = searchParams.get('slippageBps')

  if (!sellToken || !buyToken || !sellAmount || !chainId || !taker) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  const chain = parseInt(chainId)

  // Look up decimals from curated token list — required by Paraswap, helpful for others
  const srcDecimals  = getTokenByAddress(sellToken, chain)?.decimals ?? 18
  const destDecimals = getTokenByAddress(buyToken,  chain)?.decimals ?? 18

  try {
    const result = await getBestPrice({
      sellToken,
      buyToken,
      sellAmount:   BigInt(sellAmount),
      chainId:      chain,
      taker,
      slippageBps:  slippageBps ? parseInt(slippageBps) : undefined,
      srcDecimals,
      destDecimals,
    })

    return NextResponse.json({
      ...result,
      buyAmount:     result.buyAmount.toString(),
      estimatedGas:  result.estimatedGas.toString(),
      providerName:  result.providerName,
      supportsFee:   result.supportsFee,
      routerAddress: result.routerAddress,
      allQuotes:     result.allQuotes.map(q => ({
        providerName:  q.providerName,
        supportsFee:   q.supportsFee,
        buyAmount:     q.buyAmount.toString(),
        price:         q.price,
        priceImpact:   q.priceImpact,
        estimatedGas:  q.estimatedGas.toString(),
        sources:       q.sources,
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/price]', message)
    if (message === 'NO_LIQUIDITY') {
      return NextResponse.json({ error: 'NO_LIQUIDITY' }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
