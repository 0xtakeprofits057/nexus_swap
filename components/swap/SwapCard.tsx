'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { TokenInput }                       from './TokenInput'
import { SwapButton }                       from './SwapButton'
import { SwapDetails }                      from './SwapDetails'
import { useSwapQuote }                     from '@/hooks/useSwapQuote'
import { useApproval }                      from '@/hooks/useApproval'
import { useSwapExecution }                 from '@/hooks/useSwapExecution'
import { useTokenBalance }                  from '@/hooks/useTokenBalance'
import { parseTokenAmount, formatTokenAmount } from '@/lib/format'
import { DEFAULT_PAIRS, getTokenByAddress }    from '@/lib/tokens'
import { SUPPORTED_CHAINS, CHAIN_NAMES }       from '@/lib/chains'
import { SLIPPAGE_CROSS_PEG }               from '@/lib/constants'
import type { Token }                       from '@/lib/providers/types'

export function SwapCard() {
  const chainId         = useChainId()
  const { address }     = useAccount()
  const { switchChain } = useSwitchChain()

  const [sellToken,     setSellToken]     = useState<Token | null>(null)
  const [buyToken,      setBuyToken]      = useState<Token | null>(null)
  const [sellAmountStr, setSellAmountStr] = useState('')

  useEffect(() => {
    const [defaultSell, defaultBuy] = DEFAULT_PAIRS[chainId] ?? []
    if (defaultSell) setSellToken(getTokenByAddress(defaultSell, chainId) ?? null)
    if (defaultBuy)  setBuyToken(getTokenByAddress(defaultBuy,  chainId) ?? null)
    setSellAmountStr('')
  }, [chainId])

  const sellAmount = sellToken
    ? parseTokenAmount(sellAmountStr, sellToken.decimals)
    : 0n

  const { data: quote, isLoading: quoteLoading, error: quoteError } = useSwapQuote({
    sellToken, buyToken, sellAmount, chainId, slippageBps: SLIPPAGE_CROSS_PEG,
  })

  const buyAmountStr = buyToken && quote?.buyAmount
    ? formatTokenAmount(quote.buyAmount, buyToken.decimals, 6)
    : ''

  const { balance } = useTokenBalance(sellToken)

  // Dynamic spender: Permit2 for 0x, router address for Odos/KyberSwap
  const spenderOverride = quote?.routerAddress
  const { needsApproval, approve, isApproving, refetchAllowance, approveError } =
    useApproval(sellToken, address, spenderOverride)

  const { executeSwap, status: swapStatus, txHash, error: swapError, reset } =
    useSwapExecution()

  // Clear any lingering swap error when the user changes tokens or amount
  useEffect(() => { reset() }, [sellToken?.address, buyToken?.address, sellAmountStr]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwap = useCallback(async () => {
    if (!sellToken || !buyToken) return
    await executeSwap(
      sellToken,
      buyToken,
      sellAmount,
      chainId,
      SLIPPAGE_CROSS_PEG,
      quote?.providerName,   // pass winning provider for firm quote + execution routing
    )
    await refetchAllowance()
    setSellAmountStr('')
  }, [sellToken, buyToken, sellAmount, chainId, quote?.providerName, executeSwap, refetchAllowance])

  function flipTokens() {
    setSellToken(buyToken)
    setBuyToken(sellToken)
    setSellAmountStr(buyAmountStr)
  }

  // Explorer URL per chain
  const explorerTxUrl = txHash
    ? ({
        1:     `https://etherscan.io/tx/${txHash}`,
        137:   `https://polygonscan.com/tx/${txHash}`,
        42161: `https://arbiscan.io/tx/${txHash}`,
        10:    `https://optimistic.etherscan.io/tx/${txHash}`,
        8453:  `https://basescan.org/tx/${txHash}`,
      }[chainId] ?? `https://polygonscan.com/tx/${txHash}`)
    : undefined

  return (
    <div className="bg-[#141414] border border-gray-800 rounded-2xl p-4 shadow-2xl">
      {/* Chain selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Chain</span>
        <select
          value={chainId}
          onChange={(e) => switchChain?.({ chainId: parseInt(e.target.value) })}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-green-500 transition-colors cursor-pointer"
        >
          {SUPPORTED_CHAINS.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {CHAIN_NAMES[chain.id] ?? chain.name}
            </option>
          ))}
        </select>
      </div>

      <TokenInput
        label="You pay"
        token={sellToken}
        amount={sellAmountStr}
        onAmountChange={setSellAmountStr}
        onTokenChange={setSellToken}
        excludedToken={buyToken?.address as `0x${string}` | undefined}
      />

      <div className="flex justify-center my-2">
        <button
          onClick={flipTokens}
          className="w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all hover:rotate-180 duration-300"
        >
          ↕
        </button>
      </div>

      <TokenInput
        label="You receive"
        token={buyToken}
        amount={buyAmountStr}
        onTokenChange={setBuyToken}
        excludedToken={sellToken?.address as `0x${string}` | undefined}
        readOnly
        isLoading={quoteLoading && sellAmount > 0n}
      />

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
            providerName={quote.providerName}
            supportsFee={quote.supportsFee ?? true}
            allQuotes={quote.allQuotes}
          />
        </div>
      )}

      {approveError && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm">
          Approval failed: {approveError}
        </div>
      )}

      {(quoteError || swapError) && (
        <div className="mt-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-xl text-amber-400 text-sm">
          {(quoteError as Error)?.message === 'NO_LIQUIDITY'
            ? '⚠️ No route found for this pair on this chain. Switch to Polygon for BRLA, EMXN, and other local stablecoins.'
            : (quoteError as Error)?.message ?? swapError}
        </div>
      )}

      {swapStatus === 'success' && txHash && explorerTxUrl && (
        <div className="mt-3 p-3 bg-green-900/20 border border-green-800/50 rounded-xl text-green-400 text-sm flex items-center justify-between">
          <span>✓ Swap confirmed!</span>
          <a
            href={explorerTxUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-green-300 hover:text-green-200"
          >
            View tx ↗
          </a>
        </div>
      )}

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
        <button
          onClick={reset}
          className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Start new swap
        </button>
      )}

      <div className="mt-3 text-center text-xs text-gray-600">
        best price across 0x · 1inch · Paraswap · OpenOcean · Odos · KyberSwap · LiFi
      </div>
    </div>
  )
}
