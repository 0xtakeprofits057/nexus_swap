'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, maxUint256 } from 'viem'
import { PERMIT2_ADDRESS }      from '@/lib/constants'
import type { Token }           from '@/lib/providers/types'

export function useApproval(token: Token | null, ownerAddress?: `0x${string}`) {
  // Read current allowance to Permit2
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      token?.address,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         ownerAddress ? [ownerAddress, PERMIT2_ADDRESS] : undefined,
    query:        { enabled: !!token && !!ownerAddress },
  })

  const { writeContract, data: approveTxHash, isPending: isApproving } = useWriteContract()

  const { isLoading: isWaitingApproval, isSuccess: isApproved } =
    useWaitForTransactionReceipt({ hash: approveTxHash })

  const needsApproval =
    !!token &&
    !!ownerAddress &&
    (allowance === undefined || (allowance as bigint) === 0n)

  function approve() {
    if (!token) return
    writeContract({
      address:      token.address,
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
