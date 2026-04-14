'use client'

import { formatPercent, priceImpactColor, formatTokenAmount } from '@/lib/format'
import { FEE_PERCENTAGE }          from '@/lib/constants'
import type { Token }              from '@/lib/providers/types'
import type { ProviderPriceResult } from '@/lib/providers/aggregator'

interface SwapDetailsProps {
  price:         string
  priceImpact:   number
  estimatedGas:  bigint
  sources:       { name: string; proportion: string }[]
  sellToken:     Token
  buyToken:      Token
  buyAmount:     bigint
  providerName:  string
  allQuotes:     ProviderPriceResult[]
}

const PROVIDER_COLORS: Record<string, string> = {
  '0x':        'text-blue-400',
  'Odos':      'text-purple-400',
  'KyberSwap': 'text-cyan-400',
}

const PROVIDER_BADGES: Record<string, string> = {
  '0x':        'bg-blue-900/40 border-blue-800/50',
  'Odos':      'bg-purple-900/40 border-purple-800/50',
  'KyberSwap': 'bg-cyan-900/40 border-cyan-800/50',
}

export function SwapDetails({
  price,
  priceImpact,
  estimatedGas,
  sources,
  sellToken,
  buyToken,
  buyAmount,
  providerName,
  allQuotes,
}: SwapDetailsProps) {
  const topSources = sources
    .filter((s) => parseFloat(s.proportion) > 0)
    .sort((a, b) => parseFloat(b.proportion) - parseFloat(a.proportion))
    .slice(0, 3)

  const impactClass = priceImpactColor(priceImpact * 100)
  const color  = PROVIDER_COLORS[providerName] ?? 'text-green-400'
  const badge  = PROVIDER_BADGES[providerName] ?? 'bg-green-900/40 border-green-800/50'

  // Sort allQuotes best-first for comparison display
  const sortedQuotes = [...allQuotes].sort((a, b) =>
    Number(b.buyAmount - a.buyAmount),
  )
  const bestAmount = sortedQuotes[0]?.buyAmount ?? 0n

  return (
    <div className="bg-gray-900/50 rounded-xl p-3 space-y-2 text-sm border border-gray-800">

      {/* Best provider badge */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">Best via</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge} ${color}`}>
          {providerName}
        </span>
      </div>

      {/* Multi-provider comparison (shown when >1 quote) */}
      {sortedQuotes.length > 1 && (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          {sortedQuotes.map((q, i) => {
            const isBest  = i === 0
            const savings = bestAmount > 0n && !isBest
              ? Number((bestAmount - q.buyAmount) * 10000n / bestAmount) / 100
              : 0
            const qColor  = PROVIDER_COLORS[q.providerName] ?? 'text-gray-400'
            return (
              <div
                key={q.providerName}
                className={`flex items-center justify-between px-3 py-1.5 ${
                  isBest ? 'bg-gray-800/60' : ''
                } ${i < sortedQuotes.length - 1 ? 'border-b border-gray-800' : ''}`}
              >
                <span className={`font-medium ${qColor}`}>{q.providerName}</span>
                <div className="flex items-center gap-2">
                  <span className={`tabular-nums ${isBest ? 'text-white' : 'text-gray-500'}`}>
                    {formatTokenAmount(q.buyAmount, buyToken.decimals, 4)} {buyToken.symbol}
                  </span>
                  {isBest && (
                    <span className="text-xs text-green-400 font-semibold">Best</span>
                  )}
                  {!isBest && savings > 0 && (
                    <span className="text-xs text-red-400">-{savings.toFixed(2)}%</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rate */}
      <div className="flex justify-between text-gray-400">
        <span>Rate</span>
        <span className="text-white">
          1 {sellToken.symbol} = {parseFloat(price).toFixed(4)} {buyToken.symbol}
        </span>
      </div>

      {/* Fee */}
      <div className="flex justify-between text-gray-400">
        <span>Fee (0.30%)</span>
        <span className="text-yellow-400">
          {(Number(buyAmount) * FEE_PERCENTAGE / (1 - FEE_PERCENTAGE) / 10 ** buyToken.decimals).toFixed(4)} {buyToken.symbol}
        </span>
      </div>

      {/* Price impact */}
      <div className="flex justify-between text-gray-400">
        <span>Price impact</span>
        <span className={impactClass}>
          {priceImpact < 0.0001 ? '<0.01%' : formatPercent(priceImpact)}
        </span>
      </div>

      {/* Route */}
      {topSources.length > 0 && (
        <div className="flex justify-between text-gray-400">
          <span>Route</span>
          <span className="text-gray-300 text-right max-w-[60%] truncate">
            {topSources.map((s) => s.name).join(' + ')}
          </span>
        </div>
      )}

      {/* Gas */}
      <div className="flex justify-between text-gray-400">
        <span>Est. gas</span>
        <span className="text-gray-300">{Number(estimatedGas).toLocaleString()} units</span>
      </div>
    </div>
  )
}
