'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, maxUint256 }  from 'viem'
import { PERMIT2_ADDRESS, NATIVE_TOKEN_ADDRESS } from '@/lib/constants'
import type { Token }            from '@/lib/providers/types'

function isNative(token: Token | null): boolean {
  return token?.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
}

export function useApproval(token: Token | null, ownerAddress?: `0x${string}`) {
  const native = isNative(token)

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      token?.address as `0x${string}`,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         ownerAddress ? [ownerAddress, PERMIT2_ADDRESS] : undefined,
    query:        { enabled: !native && !!token && !!ownerAddress },
  })

  const { writeContract, data: approveTxHash, isPending: isApproving } = useWriteContract()

  const { isLoading: isWaitingApproval, isSuccess: isApproved } =
    useWaitForTransactionReceipt({ hash: approveTxHash })

  // Native tokens never need approval
  const needsApproval =
    !native &&
    !!token &&
    !!ownerAddress &&
    (allowance === undefined || (allowance as bigint) === 0n)

  function approve() {
    if (!token || native) return
    writeContract({
      address:      token.address as `0x${string}`,
      abi:          erc20Abi,
      functionName: 'approve',
      args:         [PERMIT2_ADDRESS, maxUint256],
    })
  }

  return {
    needsApproval,
    approve,
    isApproving:   isApproving || isWaitingApproval,
    isApproved,
    refetchAllowance,
  }
}
