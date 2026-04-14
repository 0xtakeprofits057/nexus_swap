'use client'

import { useState }                                               from 'react'
import { useSignTypedData, useSendTransaction, useAccount }       from 'wagmi'
import { concat, Hex }                                            from 'viem'
import type { Token, SwapQuoteResult }                            from '@/lib/providers/types'

export type SwapStatus = 'idle' | 'signing' | 'pending' | 'success' | 'error'

export function useSwapExecution() {
  const { address } = useAccount()
  const { signTypedDataAsync }                   = useSignTypedData()
  const { sendTransactionAsync }                 = useSendTransaction()
  const [status, setStatus]                      = useState<SwapStatus>('idle')
  const [txHash, setTxHash]                      = useState<`0x${string}` | undefined>()
  const [error, setError]                        = useState<string | undefined>()

  async function executeSwap(
    sellToken: Token,
    buyToken:  Token,
    sellAmount: bigint,
    chainId:   number,
    slippageBps?: number
  ) {
    if (!address) return
    setError(undefined)

    try {
      // 1. Fetch firm quote
      setStatus('signing')
      const res = await fetch(
        `/api/quote?${new URLSearchParams({
          sellToken:   sellToken.address,
          buyToken:    buyToken.address,
          sellAmount:  sellAmount.toString(),
          chainId:     chainId.toString(),
          taker:       address,
          ...(slippageBps ? { slippageBps: slippageBps.toString() } : {}),
        })}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to fetch quote')
      }
      const quote: SwapQuoteResult & { buyAmount: string; estimatedGas: string; transaction: { to: string; data: string; value: string; gas: string } } = await res.json()

      let txData = quote.transaction.data as Hex

      // 2. Sign Permit2 EIP-712 if required
      if (quote.permit2?.eip712) {
        const { domain, types, message, primaryType } = quote.permit2.eip712
        const signature = await signTypedDataAsync({
          domain:      domain  as Parameters<typeof signTypedDataAsync>[0]['domain'],
          types:       types   as Parameters<typeof signTypedDataAsync>[0]['types'],
          message:     message as Parameters<typeof signTypedDataAsync>[0]['message'],
          primaryType: primaryType as string,
        })
        // Append signature to tx data (0x Permit2 expects this)
        const sigHex = signature.slice(2) as Hex
        txData = concat([txData, sigHex])
      }

      // 3. Send transaction
      setStatus('pending')
      const hash = await sendTransactionAsync({
        to:    quote.transaction.to    as `0x${string}`,
        data:  txData,
        value: BigInt(quote.transaction.value ?? '0'),
        gas:   BigInt(quote.transaction.gas ?? '0'),
      })
      setTxHash(hash)
      setStatus('success')

      // 4. Fire analytics event (non-blocking)
      void fetch('/api/analytics/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash:     hash,
          chainId,
          sellToken:  sellToken.symbol,
          buyToken:   buyToken.symbol,
          sellAmount: sellAmount.toString(),
          buyAmount:  quote.buyAmount,
          walletAddress: address,
        }),
      })

      return hash
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Swap failed'
      setError(msg)
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setTxHash(undefined)
    setError(undefined)
  }

  return { executeSwap, status, txHash, error, reset }
}
