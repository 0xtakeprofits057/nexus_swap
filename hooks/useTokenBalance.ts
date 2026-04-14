'use client'

import { useReadContract, useAccount } from 'wagmi'
import { erc20Abi }                    from 'viem'
import type { Token }                  from '@/lib/providers/types'

export function useTokenBalance(token: Token | null) {
  const { address } = useAccount()

  const { data, isLoading, refetch } = useReadContract({
    address:      token?.address,
    abi:          erc20Abi,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query:        { enabled: !!token && !!address },
  })

  return {
    balance:   (data as bigint | undefined) ?? 0n,
    isLoading,
    refetch,
  }
}
