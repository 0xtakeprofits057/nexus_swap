'use client'

import { useQuery }       from '@tanstack/react-query'
import { useAccount }     from 'wagmi'
import { QUOTE_STALE_MS, QUOTE_REFETCH_MS, SLIPPAGE_CROSS_PEG } from '@/lib/constants'
import type { Token }     from '@/lib/providers/types'

interface UseSwapQuoteParams {
  sellToken:  Token | null
  buyToken:   Token | null
  sellAmount: bigint
  chainId:    number
  slippageBps?: number
}

export function useSwapQuote({
  sellToken,
  buyToken,
  sellAmount,
  chainId,
  slippageBps = SLIPPAGE_CROSS_PEG,
}: UseSwapQuoteParams) {
  const { address } = useAccount()

  const enabled =
    !!sellToken &&
    !!buyToken &&
    !!address &&
    sellAmount > 0n &&
    sellToken.address !== buyToken.address

  return useQuery({
    queryKey: ['swap-price', sellToken?.address, buyToken?.address, sellAmount.toString(), chainId, address],
    queryFn: async () => {
      const res = await fetch(
        `/api/price?${new URLSearchParams({
          sellToken:  sellToken!.address,
          buyToken:   buyToken!.address,
          sellAmount: sellAmount.toString(),
          chainId:    chainId.toString(),
          taker:      address!,
          slippageBps: slippageBps.toString(),
        })}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to fetch quote')
      }
      const data = await res.json()
      return {
        ...data,
        buyAmount:    BigInt(data.buyAmount ?? '0'),
        estimatedGas: BigInt(data.estimatedGas ?? '0'),
      }
    },
    enabled,
    staleTime:      QUOTE_STALE_MS,
    refetchInterval: QUOTE_REFETCH_MS,
    retry: 2,
  })
}
