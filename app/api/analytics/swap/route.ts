import { NextRequest, NextResponse } from 'next/server'

interface SwapEvent {
  txHash:        string
  chainId:       number
  sellToken:     string
  buyToken:      string
  sellAmount:    string
  buyAmount:     string
  walletAddress: string
  timestamp:     string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<SwapEvent, 'timestamp'>
    const event: SwapEvent = { ...body, timestamp: new Date().toISOString() }

    // ── Vercel KV storage (enable after connecting KV in Vercel dashboard) ──
    // Uncomment when KV env vars are available:
    //
    // const { kv } = await import('@vercel/kv')
    // await Promise.all([
    //   kv.lpush('swaps:all', JSON.stringify(event)),
    //   kv.incr(`volume:chain:${event.chainId}`),
    //   kv.incr(`pair:${event.sellToken}:${event.buyToken}`),
    //   kv.sadd('wallets', event.walletAddress),
    // ])

    // ── Console log for now (always runs) ──────────────────────────────────
    console.log('[swap]', JSON.stringify(event))

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/analytics/swap]', message)
    // Analytics errors should never block the user
    return NextResponse.json({ ok: false, error: message }, { status: 200 })
  }
}
