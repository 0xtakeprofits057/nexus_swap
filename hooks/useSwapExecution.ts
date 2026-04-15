'use client'

import { useState }                                                       from 'react'
import { useSignTypedData, useSendTransaction, useAccount, usePublicClient } from 'wagmi'
import { concat, Hex }                                                    from 'viem'
import type { Token }                                                     from '@/lib/providers/types'

export type SwapStatus = 'idle' | 'signing' | 'pending' | 'confirming' | 'success' | 'error'

export function useSwapExecution() {
  const { address }              = useAccount()
  const { signTypedDataAsync }   = useSignTypedData()
  const { sendTransactionAsync } = useSendTransaction()
  const publicClient             = usePublicClient()
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

      // Safety: never send a contract-creation transaction by accident.
      // If `to` is missing/null the EVM treats it as a contract deployment.
      const toAddress = tx.to as `0x${string}` | undefined
      if (!toAddress || toAddress === '0x' || toAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid swap transaction: missing destination address')
      }

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
        // Append Permit2 signature to calldata.
        // IMPORTANT: pass `signature` directly — do NOT slice off the 0x prefix.
        // viem's concat expects full 0x-prefixed hex strings.
        txData = concat([txData, signature])
      }

      // 3. Send transaction (works for all providers — Odos/KyberSwap need no signature)
      setStatus('pending')
      const hash = await sendTransactionAsync({
        to:    toAddress,
        data:  txData,
        value: BigInt(tx.value ?? '0'),
        gas:   BigInt(tx.gas   ?? '0'),
      })
      setTxHash(hash)

      // 4. Wait for on-chain confirmation (1 block)
      setStatus('confirming')
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
      }
      setStatus('success')

      // 5. Analytics (non-blocking)
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
