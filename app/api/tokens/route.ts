// GET /api/tokens?chainId=137
// Returns merged token list: curated local stablecoins + Uniswap token list
// Caches Uniswap list for 1 hour server-side

import { NextRequest, NextResponse } from 'next/server'
import tokenList from '@/tokens/local-stablecoins.json'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawToken {
  chainId:  number
  address:  string
  symbol:   string
  name:     string
  decimals: number
  logoURI?: string
}

// ─── Token list sources ────────────────────────────────────────────────────────

// Uniswap default token list — covers ETH, Polygon, Arbitrum, Optimism, Base
const UNISWAP_TOKEN_LIST = 'https://tokens.uniswap.org'

// Polygon curated list for extra local-market tokens
const POLYGON_TOKEN_LIST = 'https://unpkg.com/quickswap-default-token-list@1.2.33/build/quickswap-default.tokenlist.json'

const SUPPORTED_CHAINS = new Set([1, 137, 42161, 10, 8453])

// ─── Cache ────────────────────────────────────────────────────────────────────

let cachedTokens: RawToken[] | null = null
let cacheTime = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

async function fetchTokenLists(): Promise<RawToken[]> {
  const now = Date.now()
  if (cachedTokens && now - cacheTime < CACHE_TTL) return cachedTokens

  const results = await Promise.allSettled([
    fetch(UNISWAP_TOKEN_LIST, { next: { revalidate: 3600 } }).then((r) => r.json()),
    fetch(POLYGON_TOKEN_LIST, { next: { revalidate: 3600 } }).then((r) => r.json()),
  ])

  const tokens: RawToken[] = []
  const seen = new Set<string>() // `${chainId}:${address.lower}`

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const list = result.value as { tokens?: RawToken[] }
    for (const t of list.tokens ?? []) {
      if (!SUPPORTED_CHAINS.has(t.chainId)) continue
      const key = `${t.chainId}:${t.address.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      tokens.push(t)
    }
  }

  cachedTokens = tokens
  cacheTime    = now
  return tokens
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const chainId = parseInt(req.nextUrl.searchParams.get('chainId') ?? '137', 10)

  if (!SUPPORTED_CHAINS.has(chainId)) {
    return NextResponse.json({ error: 'Chain not supported' }, { status: 400 })
  }

  // Local stablecoins — always authoritative (our curated list)
  const localTokens = tokenList.tokens.filter((t) => t.chainId === chainId)
  const localAddrs  = new Set(localTokens.map((t) => t.address.toLowerCase()))

  // Fetch external token lists
  let externalTokens: RawToken[] = []
  try {
    const all = await fetchTokenLists()
    externalTokens = all.filter(
      (t) => t.chainId === chainId && !localAddrs.has(t.address.toLowerCase())
    )
  } catch {
    // External fetch failed — serve local list only
    externalTokens = []
  }

  // Merge: local stablecoins first (with category), then external (category='other')
  const merged = [
    ...localTokens,
    ...externalTokens.map((t) => ({
      ...t,
      category: 'other' as const,
    })),
  ]

  return NextResponse.json(
    { tokens: merged, chainId },
    {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    }
  )
}
