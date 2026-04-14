'use client'

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, maxUint256 }  from 'viem'
import { PERMIT2_ADDRESS, NATIVE_TOKEN_ADDRESS } from '@/lib/constants'
import type { Token }            from '@/lib/providers/types'

function isNative(token: Token | null): boolean {
  return token?.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
}

export function useApproval(
  token:         Token | null,
  ownerAddress?: `0x${string}`,
  // Optional: override spender — defaults to Permit2 (0x), pass router address for Odos/KyberSwap
  spenderOverride?: `0x${string}`,
) {
  const native  = isNative(token)
  const spender = spenderOverride ?? PERMIT2_ADDRESS

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      token?.address as `0x${string}`,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         ownerAddress ? [ownerAddress, spender] : undefined,
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
      args:         [spender, maxUint256],
    })
  }

  return {
    needsApproval,
    approve,
    isApproving:  isApproving || isWaitingApproval,
    isApproved,
    refetchAllowance,
    spender,
  }
}
