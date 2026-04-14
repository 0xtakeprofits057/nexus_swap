'use client'

import { formatPercent, priceImpactColor } from '@/lib/format'
import { FEE_PERCENTAGE }                  from '@/lib/constants'
import type { Token }                      from '@/lib/providers/types'

interface SwapDetailsProps {
  price:        string
  priceImpact:  number
  estimatedGas: bigint
  sources:      { name: string; proportion: string }[]
  sellToken:    Token
  buyToken:     Token
  buyAmount:    bigint
}

export function SwapDetails({
  price,
  priceImpact,
  estimatedGas,
  sources,
  sellToken,
  buyToken,
  buyAmount,
}: SwapDetailsProps) {
  const topSources = sources
    .filter((s) => parseFloat(s.proportion) > 0)
    .sort((a, b) => parseFloat(b.proportion) - parseFloat(a.proportion))
    .slice(0, 3)

  const impactClass = priceImpactColor(priceImpact * 100)

  return (
    <div className="bg-gray-900/50 rounded-xl p-3 space-y-2 text-sm border border-gray-800">
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
