import { NextRequest, NextResponse } from 'next/server'
import { getBestQuote }              from '@/lib/providers/aggregator'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const sellToken        = searchParams.get('sellToken')  as `0x${string}` | null
  const buyToken         = searchParams.get('buyToken')   as `0x${string}` | null
  const sellAmount       = searchParams.get('sellAmount')
  const chainId          = searchParams.get('chainId')
  const taker            = searchParams.get('taker')      as `0x${string}` | null
  const slippageBps      = searchParams.get('slippageBps')
  const preferredProvider = searchParams.get('provider')  ?? undefined

  if (!sellToken || !buyToken || !sellAmount || !chainId || !taker) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  try {
    const result = await getBestQuote(
      {
        sellToken,
        buyToken,
        sellAmount:  BigInt(sellAmount),
        chainId:     parseInt(chainId),
        taker,
        slippageBps: slippageBps ? parseInt(slippageBps) : undefined,
      },
      preferredProvider,
    )

    return NextResponse.json({
      ...result,
      buyAmount:     result.buyAmount.toString(),
      sellAmount:    result.sellAmount.toString(),
      estimatedGas:  result.estimatedGas.toString(),
      providerName:  result.providerName,
      routerAddress: result.routerAddress,
      transaction: {
        ...result.transaction,
        value: result.transaction.value.toString(),
        gas:   result.transaction.gas.toString(),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/quote]', message)
    if (message === 'NO_LIQUIDITY') {
      return NextResponse.json({ error: 'NO_LIQUIDITY' }, { status: 400 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
