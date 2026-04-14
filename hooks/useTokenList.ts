'use client'

import { useMemo }              from 'react'
import { useChainId }           from 'wagmi'
import { getTokensByChain, getLocalStables, getUsdStables } from '@/lib/tokens'
import type { Token }           from '@/lib/providers/types'

export function useTokenList() {
  const chainId = useChainId()

  const allTokens     = useMemo(() => getTokensByChain(chainId), [chainId])
  const localStables  = useMemo(() => getLocalStables(chainId),  [chainId])
  const usdStables    = useMemo(() => getUsdStables(chainId),    [chainId])

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

  return { allTokens, localStables, usdStables, searchTokens, chainId }
}
