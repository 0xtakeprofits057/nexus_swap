'use client'

import { ConnectButton }  from '@rainbow-me/rainbowkit'
import { useAccount }     from 'wagmi'
import type { Token }     from '@/lib/providers/types'
import type { SwapStatus } from '@/hooks/useSwapExecution'

interface SwapButtonProps {
  sellToken:      Token | null
  sellAmount:     bigint
  balance:        bigint
  needsApproval:  boolean
  isApproving:    boolean
  swapStatus:     SwapStatus
  onApprove:      () => void
  onSwap:         () => void
  quoteLoading:   boolean
}

export function SwapButton({
  sellToken,
  sellAmount,
  balance,
  needsApproval,
  isApproving,
  swapStatus,
  onApprove,
  onSwap,
  quoteLoading,
}: SwapButtonProps) {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button
            onClick={openConnectModal}
            className="w-full py-4 rounded-xl font-semibold text-base bg-green-500 hover:bg-green-400 text-black transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </ConnectButton.Custom>
    )
  }

  if (!sellToken || sellAmount === 0n) {
    return (
      <button disabled className="w-full py-4 rounded-xl font-semibold text-base bg-gray-800 text-gray-500 cursor-not-allowed">
        Enter an amount
      </button>
    )
  }

  if (sellAmount > balance) {
    return (
      <button disabled className="w-full py-4 rounded-xl font-semibold text-base bg-red-900/30 text-red-400 cursor-not-allowed border border-red-800/50">
        Insufficient {sellToken.symbol} balance
      </button>
    )
  }

  if (needsApproval) {
    return (
      <button
        onClick={onApprove}
        disabled={isApproving}
        className="w-full py-4 rounded-xl font-semibold text-base bg-yellow-500 hover:bg-yellow-400 text-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isApproving ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Approving {sellToken.symbol}...
          </span>
        ) : (
          `Approve ${sellToken.symbol}`
        )}
      </button>
    )
  }

  if (swapStatus === 'signing') {
    return (
      <button disabled className="w-full py-4 rounded-xl font-semibold text-base bg-green-600 text-white opacity-80 cursor-not-allowed">
        <span className="flex items-center justify-center gap-2"><Spinner /> Sign in wallet...</span>
      </button>
    )
  }

  if (swapStatus === 'pending') {
    return (
      <button disabled className="w-full py-4 rounded-xl font-semibold text-base bg-green-600 text-white opacity-80 cursor-not-allowed">
        <span className="flex items-center justify-center gap-2"><Spinner /> Swapping...</span>
      </button>
    )
  }

  return (
    <button
      onClick={onSwap}
      disabled={quoteLoading}
      className="w-full py-4 rounded-xl font-semibold text-base bg-green-500 hover:bg-green-400 text-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {quoteLoading ? (
        <span className="flex items-center justify-center gap-2"><Spinner /> Getting best price...</span>
      ) : (
        'Swap'
      )}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
