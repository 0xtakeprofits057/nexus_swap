'use client'

import { useReadContract, useAccount, useBalance } from 'wagmi'
import { erc20Abi }                                from 'viem'
import { NATIVE_TOKEN_ADDRESS }                    from '@/lib/constants'
import type { Token }                              from '@/lib/providers/types'

function isNative(token: Token | null): boolean {
  return token?.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
}

export function useTokenBalance(token: Token | null) {
  const { address } = useAccount()
  const native = isNative(token)

  const { data: nativeBal, isLoading: nativeLoading } = useBalance({
    address,
    query: { enabled: native && !!address },
  })

  const { data: erc20Bal, isLoading: erc20Loading, refetch } = useReadContract({
    address:      token?.address as `0x${string}`,
    abi:          erc20Abi,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query:        { enabled: !native && !!token && !!address },
  })

  return {
    balance:   native ? (nativeBal?.value ?? 0n) : ((erc20Bal as bigint | undefined) ?? 0n),
    isLoading: native ? nativeLoading : erc20Loading,
    refetch:   refetch ?? (() => Promise.resolve()),
  }
}
