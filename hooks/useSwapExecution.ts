'use client'

import { useState }                                               from 'react'
import { useSignTypedData, useSendTransaction, useAccount }       from 'wagmi'
import { concat, Hex }                                            from 'viem'
import type { Token }                                             from '@/lib/providers/types'

export type SwapStatus = 'idle' | 'signing' | 'pending' | 'success' | 'error'

export function useSwapExecution() {
  const { address }              = useAccount()
  const { signTypedDataAsync }   = useSignTypedData()
  const { sendTransactionAsync } = useSendTransaction()
  const [status,  setStatus]     = useState<SwapStatus>('idle')
  const [txHash,  setTxHash]     = useState<`0x${string}` | undefined>()
  const [error,   setError]      = useState<string | undefined>()

  async function executeSwap(
    sellToken:        Token,
    buyToken:         Token,
    sellAmount:       bigint,
    chainId:          number,
    slippageBps?:     number,
    preferredProvider?: string,   // e.g. '0x', 'Odos', 'KyberSwap'
  ) {
    if (!address) return
    setError(undefined)

    try {
      // 1. Fetch firm quote from the winning provider
      setStatus('signing')
      const params = new URLSearchParams({
        sellToken:   sellToken.address,
        buyToken:    buyToken.address,
        sellAmount:  sellAmount.toString(),
        chainId:     chainId.toString(),
        taker:       address,
        ...(slippageBps         ? { slippageBps: slippageBps.toString() } : {}),
        ...(preferredProvider   ? { provider:    preferredProvider       } : {}),
      })
      const res = await fetch(`/api/quote?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to fetch quote')
      }
      const quote = await res.json()
      const tx    = quote.transaction

      let txData = tx.data as Hex

      // 2. Permit2 EIP-712 signing — only needed for 0x
      const provider = quote.providerName ?? preferredProvider ?? '0x'
      if (provider === '0x' && quote.permit2?.eip712) {
        const { domain, types, message, primaryType } = quote.permit2.eip712
        const signature = await signTypedDataAsync({
          domain:      domain      as Parameters<typeof signTypedDataAsync>[0]['domain'],
          types:       types       as Parameters<typeof signTypedDataAsync>[0]['types'],
          message:     message     as Parameters<typeof signTypedDataAsync>[0]['message'],
          primaryType: primaryType as string,
        })
        // Append Permit2 signature to calldata
        txData = concat([txData, signature.slice(2) as Hex])
      }

      // 3. Send transaction (works for all providers — Odos/KyberSwap need no signature)
      setStatus('pending')
      const hash = await sendTransactionAsync({
        to:    tx.to    as `0x${string}`,
        data:  txData,
        value: BigInt(tx.value ?? '0'),
        gas:   BigInt(tx.gas   ?? '0'),
      })
      setTxHash(hash)
      setStatus('success')

      // 4. Analytics (non-blocking)
      void fetch('/api/analytics/swap', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash:        hash,
          chainId,
          sellToken:     sellToken.symbol,
          buyToken:      buyToken.symbol,
          sellAmount:    sellAmount.toString(),
          buyAmount:     quote.buyAmount,
          walletAddress: address,
          provider,
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
