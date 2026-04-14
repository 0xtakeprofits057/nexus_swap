'use client'

import { useState }          from 'react'
import { TokenSelector }     from './TokenSelector'
import { useTokenBalance }   from '@/hooks/useTokenBalance'
import { formatTokenAmount, parseTokenAmount } from '@/lib/format'
import type { Token }        from '@/lib/providers/types'

interface TokenInputProps {
  label:         string
  token:         Token | null
  amount:        string
  onAmountChange?: (value: string) => void
  onTokenChange: (token: Token) => void
  excludedToken?: `0x${string}`
  readOnly?:     boolean
  isLoading?:    boolean
}

export function TokenInput({
  label,
  token,
  amount,
  onAmountChange,
  onTokenChange,
  excludedToken,
  readOnly = false,
  isLoading = false,
}: TokenInputProps) {
  const [showSelector, setShowSelector] = useState(false)
  const { balance }                     = useTokenBalance(token)

  function handleMax() {
    if (!token || !onAmountChange) return
    onAmountChange(formatTokenAmount(balance, token.decimals, token.decimals))
  }

  return (
    <>
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">{label}</span>
          {token && balance > 0n && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Balance: {formatTokenAmount(balance, token.decimals, 4)}
              </span>
              {!readOnly && (
                <button
                  onClick={handleMax}
                  className="text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  MAX
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Amount input */}
          <div className="flex-1">
            {isLoading ? (
              <div className="h-9 w-32 bg-gray-800 rounded animate-pulse" />
            ) : (
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={amount}
                onChange={(e) => onAmountChange?.(e.target.value)}
                readOnly={readOnly}
                className="w-full bg-transparent text-2xl font-semibold text-white placeholder-gray-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            )}
          </div>

          {/* Token selector button */}
          <button
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-3 py-2 transition-colors shrink-0"
          >
            {token ? (
              <>
                {token.logoURI && (
                  <img src={token.logoURI} alt={token.symbol} className="w-5 h-5 rounded-full" />
                )}
                <span className="font-semibold text-white">{token.symbol}</span>
              </>
            ) : (
              <span className="text-gray-400 text-sm">Select token</span>
            )}
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {showSelector && (
        <TokenSelector
          onSelect={(t) => { onTokenChange(t); setShowSelector(false) }}
          onClose={() => setShowSelector(false)}
          excluded={excludedToken}
        />
      )}
    </>
  )
}
