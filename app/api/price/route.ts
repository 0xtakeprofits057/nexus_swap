import { NextRequest, NextResponse } from 'next/server'
import { getPrice }                  from '@/lib/providers/zerox'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const sellToken  = searchParams.get('sellToken')  as `0x${string}` | null
  const buyToken   = searchParams.get('buyToken')   as `0x${string}` | null
  const sellAmount = searchParams.get('sellAmount')
  const chainId    = searchParams.get('chainId')
  const taker      = searchParams.get('taker')      as `0x${string}` | null
  const slippageBps = searchParams.get('slippageBps')

  if (!sellToken || !buyToken || !sellAmount || !chainId || !taker) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  try {
    const result = await getPrice({
      sellToken,
      buyToken,
      sellAmount:   BigInt(sellAmount),
      chainId:      parseInt(chainId),
      taker,
      slippageBps:  slippageBps ? parseInt(slippageBps) : undefined,
    })

    return NextResponse.json({
      ...result,
      buyAmount:    result.buyAmount.toString(),
      estimatedGas: result.estimatedGas.toString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/price]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
