'use client'

import { useQuery }   from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { QUOTE_STALE_MS, QUOTE_REFETCH_MS, SLIPPAGE_CROSS_PEG } from '@/lib/constants'
import type { Token }            from '@/lib/providers/types'
import type { ProviderPriceResult } from '@/lib/providers/aggregator'

interface UseSwapQuoteParams {
  sellToken:   Token | null
  buyToken:    Token | null
  sellAmount:  bigint
  chainId:     number
  slippageBps?: number
}

export interface SwapQuoteData {
  buyAmount:      bigint
  price:          string
  estimatedGas:   bigint
  priceImpact:    number
  sources:        { name: string; proportion: string }[]
  providerName:   string
  supportsFee:    boolean
  routerAddress?: `0x${string}`
  allQuotes:      ProviderPriceResult[]
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

  return useQuery<SwapQuoteData>({
    queryKey: ['swap-price', sellToken?.address, buyToken?.address, sellAmount.toString(), chainId, address],
    queryFn: async () => {
      const res = await fetch(
        `/api/price?${new URLSearchParams({
          sellToken:   sellToken!.address,
          buyToken:    buyToken!.address,
          sellAmount:  sellAmount.toString(),
          chainId:     chainId.toString(),
          taker:       address!,
          slippageBps: slippageBps.toString(),
        })}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error ?? 'Failed to fetch quote'
        throw new Error(msg)
      }
      const data = await res.json()
      return {
        buyAmount:     BigInt(data.buyAmount ?? '0'),
        price:         data.price ?? '0',
        estimatedGas:  BigInt(data.estimatedGas ?? '0'),
        priceImpact:   data.priceImpact ?? 0,
        sources:       data.sources ?? [],
        providerName:  data.providerName ?? '0x',
        supportsFee:   data.supportsFee  ?? true,
        routerAddress: data.routerAddress,
        allQuotes: (data.allQuotes ?? []).map((q: {
          providerName: string
          buyAmount: string
          price: string
          priceImpact: number
          estimatedGas: string
          sources: { name: string; proportion: string }[]
        }) => ({
          ...q,
          buyAmount:    BigInt(q.buyAmount ?? '0'),
          estimatedGas: BigInt(q.estimatedGas ?? '0'),
        })),
      }
    },
    enabled,
    staleTime:       QUOTE_STALE_MS,
    refetchInterval: QUOTE_REFETCH_MS,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === 'NO_LIQUIDITY') return false
      return failureCount < 2
    },
  })
}
