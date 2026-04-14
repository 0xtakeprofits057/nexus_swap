'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId }           from 'wagmi'
import { ConnectButton }                    from '@rainbow-me/rainbowkit'
import { TokenInput }                       from './TokenInput'
import { SwapButton }                       from './SwapButton'
import { SwapDetails }                      from './SwapDetails'
import { useSwapQuote }                     from '@/hooks/useSwapQuote'
import { useApproval }                      from '@/hooks/useApproval'
import { useSwapExecution }                 from '@/hooks/useSwapExecution'
import { useTokenBalance }                  from '@/hooks/useTokenBalance'
import { parseTokenAmount, formatTokenAmount } from '@/lib/format'
import { DEFAULT_PAIRS, getTokenByAddress }    from '@/lib/tokens'
import { SLIPPAGE_CROSS_PEG }               from '@/lib/constants'
import type { Token }                       from '@/lib/providers/types'

export function SwapCard() {
  const chainId          = useChainId()
  const { address }      = useAccount()

  // ─── Token state ──────────────────────────────────────────────────────────
  const [sellToken, setSellToken] = useState<Token | null>(null)
  const [buyToken,  setBuyToken]  = useState<Token | null>(null)
  const [sellAmountStr, setSellAmountStr] = useState('')

  // Load default pair when chain changes
  useEffect(() => {
    const [defaultSell, defaultBuy] = DEFAULT_PAIRS[chainId] ?? []
    if (defaultSell) setSellToken(getTokenByAddress(defaultSell, chainId) ?? null)
    if (defaultBuy)  setBuyToken(getTokenByAddress(defaultBuy,  chainId) ?? null)
    setSellAmountStr('')
  }, [chainId])

  const sellAmount = sellToken
    ? parseTokenAmount(sellAmountStr, sellToken.decimals)
    : 0n

  // ─── Quote ────────────────────────────────────────────────────────────────
  const { data: quote, isLoading: quoteLoading, error: quoteError } = useSwapQuote({
    sellToken,
    buyToken,
    sellAmount,
    chainId,
    slippageBps: SLIPPAGE_CROSS_PEG,
  })

  const buyAmountStr = buyToken && quote?.buyAmount
    ? formatTokenAmount(quote.buyAmount, buyToken.decimals, 6)
    : ''

  // ─── Balance + approval ───────────────────────────────────────────────────
  const { balance }            = useTokenBalance(sellToken)
  const { needsApproval, approve, isApproving, refetchAllowance } =
    useApproval(sellToken, address)

  // ─── Swap execution ───────────────────────────────────────────────────────
  const { executeSwap, status: swapStatus, txHash, error: swapError, reset } =
    useSwapExecution()

  const handleSwap = useCallback(async () => {
    if (!sellToken || !buyToken) return
    await executeSwap(sellToken, buyToken, sellAmount, chainId, SLIPPAGE_CROSS_PEG)
    await refetchAllowance()
    setSellAmountStr('')
  }, [sellToken, buyToken, sellAmount, chainId, executeSwap, refetchAllowance])

  // ─── Flip tokens ─────────────────────────────────────────────────────────
  function flipTokens() {
    setSellToken(buyToken)
    setBuyToken(sellToken)
    setSellAmountStr(buyAmountStr)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#141414] border border-gray-800 rounded-2xl p-4 w-full max-w-md shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white text-lg">Swap</h2>
        <div className="flex items-center gap-2">
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </div>

      {/* Sell input */}
      <TokenInput
        label="You pay"
        token={sellToken}
        amount={sellAmountStr}
        onAmountChange={setSellAmountStr}
        onTokenChange={setSellToken}
        excludedToken={buyToken?.address}
      />

      {/* Flip button */}
      <div className="flex justify-center my-2">
        <button
          onClick={flipTokens}
          className="w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all hover:rotate-180 duration-300"
        >
          ↕
        </button>
      </div>

      {/* Buy output */}
      <TokenInput
        label="You receive"
        token={buyToken}
        amount={buyAmountStr}
        onTokenChange={setBuyToken}
        excludedToken={sellToken?.address}
        readOnly
        isLoading={quoteLoading && sellAmount > 0n}
      />

      {/* Swap details */}
      {quote && sellToken && buyToken && (
        <div className="mt-3">
          <SwapDetails
            price={quote.price}
            priceImpact={quote.priceImpact}
            estimatedGas={quote.estimatedGas}
            sources={quote.sources}
            sellToken={sellToken}
            buyToken={buyToken}
            buyAmount={quote.buyAmount}
          />
        </div>
      )}

      {/* Error */}
      {(quoteError || swapError) && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm">
          {(quoteError as Error)?.message ?? swapError}
        </div>
      )}

      {/* Success */}
      {swapStatus === 'success' && txHash && (
        <div className="mt-3 p-3 bg-green-900/20 border border-green-800/50 rounded-xl text-green-400 text-sm flex items-center justify-between">
          <span>✓ Swap confirmed!</span>
          <a
            href={`https://polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="underline text-green-300 hover:text-green-200"
          >
            View tx ↗
          </a>
        </div>
      )}

      {/* Swap button */}
      <div className="mt-3">
        <SwapButton
          sellToken={sellToken}
          sellAmount={sellAmount}
          balance={balance}
          needsApproval={needsApproval}
          isApproving={isApproving}
          swapStatus={swapStatus}
          onApprove={approve}
          onSwap={handleSwap}
          quoteLoading={quoteLoading}
        />
      </div>

      {swapStatus !== 'idle' && swapStatus !== 'signing' && swapStatus !== 'pending' && (
        <button onClick={reset} className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Start new swap
        </button>
      )}
    </div>
  )
}
