'use client'

import { useState }        from 'react'
import { useTokenList }    from '@/hooks/useTokenList'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { formatTokenAmount } from '@/lib/format'
import type { Token }      from '@/lib/providers/types'

interface TokenSelectorProps {
  onSelect: (token: Token) => void
  onClose:  () => void
  excluded?: `0x${string}`
}

function TokenRow({ token, onSelect }: { token: Token; onSelect: (t: Token) => void }) {
  const { balance } = useTokenBalance(token)
  const categoryBadge: Record<string, string> = {
    'local-stable': 'bg-green-900/50 text-green-400',
    'usd-stable':   'bg-blue-900/50  text-blue-400',
    'major':        'bg-gray-800     text-gray-400',
    'other':        'bg-gray-800     text-gray-500',
  }

  return (
    <button
      onClick={() => onSelect(token)}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors rounded-lg"
    >
      <div className="flex items-center gap-3">
        {token.logoURI ? (
          <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
            {token.symbol.slice(0, 2)}
          </div>
        )}
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{token.symbol}</span>
            {token.currency && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${categoryBadge['local-stable']}`}>
                {token.currency}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">{token.name}</div>
        </div>
      </div>
      {balance > 0n && (
        <span className="text-sm text-gray-400">
          {formatTokenAmount(balance, token.decimals, 4)}
        </span>
      )}
    </button>
  )
}

export function TokenSelector({ onSelect, onClose, excluded }: TokenSelectorProps) {
  const [query, setQuery]         = useState('')
  const { localStables, usdStables, allTokens, searchTokens } = useTokenList()

  const filtered  = query ? searchTokens(query) : null
  const displayed = filtered ?? allTokens

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-sm mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Select a token</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or address..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {/* Token list */}
        <div className="overflow-y-auto flex-1 p-2">
          {!query && (
            <>
              <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wider mb-1">🌍 Local Stablecoins</div>
              {localStables
                .filter((t) => t.address !== excluded)
                .map((t) => <TokenRow key={t.address} token={t} onSelect={onSelect} />)}

              <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wider mt-3 mb-1">💵 USD Stablecoins</div>
              {usdStables
                .filter((t) => t.address !== excluded)
                .map((t) => <TokenRow key={t.address} token={t} onSelect={onSelect} />)}

              <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wider mt-3 mb-1">All Tokens</div>
            </>
          )}
          {displayed
            .filter((t) => t.address !== excluded)
            .filter((t) => query || t.category === 'major' || t.category === 'other')
            .map((t) => <TokenRow key={t.address} token={t} onSelect={onSelect} />)}
        </div>
      </div>
    </div>
  )
}
