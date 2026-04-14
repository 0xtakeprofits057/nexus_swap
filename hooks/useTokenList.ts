'use client'

import { useMemo }           from 'react'
import { useChainId }        from 'wagmi'
import { useQuery }          from '@tanstack/react-query'
import { getLocalStables, getUsdStables } from '@/lib/tokens'
import type { Token }        from '@/lib/providers/types'

// ─── Fetch token list from /api/tokens ────────────────────────────────────────

async function fetchTokenList(chainId: number): Promise<Token[]> {
  const res = await fetch(`/api/tokens?chainId=${chainId}`)
  if (!res.ok) throw new Error('Failed to fetch token list')
  const data = await res.json() as { tokens: Token[] }
  return data.tokens
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTokenList() {
  const chainId = useChainId()

  const { data: allTokens = [], isLoading } = useQuery({
    queryKey: ['tokenList', chainId],
    queryFn:  () => fetchTokenList(chainId),
    staleTime: 60 * 60 * 1000,      // 1 hour — token lists rarely change
    gcTime:    2 * 60 * 60 * 1000,  // keep in cache 2 hours
    retry: 2,
  })

  // Featured categories come directly from our curated local list (always available)
  const localStables = useMemo(() => getLocalStables(chainId), [chainId])
  const usdStables   = useMemo(() => getUsdStables(chainId),   [chainId])

  // Tokens that are NOT in local/usd-stable categories (majors + other)
  const otherTokens  = useMemo(
    () => allTokens.filter((t) => t.category !== 'local-stable' && t.category !== 'usd-stable'),
    [allTokens],
  )

  function searchTokens(query: string): Token[] {
    const q = query.toLowerCase().trim()
    if (!q) return allTokens
    return allTokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase() === q
    )
  }

  return { allTokens, localStables, usdStables, otherTokens, searchTokens, chainId, isLoading }
}
