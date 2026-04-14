'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useTokenList }    from '@/hooks/useTokenList'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { formatTokenAmount } from '@/lib/format'
import type { Token }      from '@/lib/providers/types'

// ─── Badge colours per category ───────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, string> = {
  'local-stable': 'bg-green-900/60 text-green-400 border border-green-800',
  'usd-stable':   'bg-blue-900/60  text-blue-400  border border-blue-800',
  'major':        'bg-gray-800     text-gray-400',
  'other':        '',
}

// ─── Single token row ─────────────────────────────────────────────────────────

function TokenRow({ token, onSelect }: { token: Token; onSelect: (t: Token) => void }) {
  const { balance } = useTokenBalance(token)
  const isLocal = token.category === 'local-stable'

  return (
    <button
      onClick={() => onSelect(token)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
        isLocal ? 'hover:bg-green-950/30' : 'hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {token.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            className="w-8 h-8 rounded-full shrink-0 bg-gray-800"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
            {token.symbol.slice(0, 2)}
          </div>
        )}
        <div className="text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white">{token.symbol}</span>
            {token.currency && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_BADGE['local-stable']}`}>
                {token.currency}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">{token.name}</div>
        </div>
      </div>
      {balance > 0n && (
        <span className="text-sm text-gray-400 ml-2 shrink-0">
          {formatTokenAmount(balance, token.decimals, 4)}
        </span>
      )}
    </button>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-[#1a1a1a] z-10">
      {label}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface TokenSelectorProps {
  onSelect:  (token: Token) => void
  onClose:   () => void
  excluded?: `0x${string}`
}

export function TokenSelector({ onSelect, onClose, excluded }: TokenSelectorProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    localStables,
    usdStables,
    otherTokens,
    allTokens,
    searchTokens,
    isLoading,
  } = useTokenList()

  // Auto-focus search input
  useEffect(() => { inputRef.current?.focus() }, [])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const exclude = (t: Token) => t.address.toLowerCase() !== (excluded ?? '').toLowerCase()

  // Search results — across all tokens
  const searchResults = useMemo(
    () => (query ? searchTokens(query).filter(exclude) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, allTokens],
  )

  // Sections for non-search view
  const locals  = useMemo(() => localStables.filter(exclude), [localStables, excluded])
  const usds    = useMemo(() => usdStables.filter(exclude),   [usdStables,   excluded])
  const others  = useMemo(() => otherTokens.filter(exclude),  [otherTokens,  excluded])

  // Tokens with a balance — shown as "In your wallet" at top when no query
  // (we check balance inside TokenRow, but here we can't batch; skip for now — balances show inline)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl w-full max-w-sm mx-4 flex flex-col"
           style={{ maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 shrink-0">
          <h3 className="font-semibold text-white">Select a token</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-800 shrink-0">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, symbol, or address…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {/* Token list */}
        <div className="overflow-y-auto flex-1 min-h-0">

          {/* Loading skeleton */}
          {isLoading && !query && (
            <div className="px-4 py-6 text-center">
              <div className="text-gray-500 text-sm animate-pulse">Loading tokens…</div>
            </div>
          )}

          {/* Search results */}
          {searchResults !== null && (
            <>
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No tokens found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="p-2">
                  {searchResults.map((t) => (
                    <TokenRow key={`${t.chainId}-${t.address}`} token={t} onSelect={onSelect} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Grouped default view */}
          {!searchResults && !isLoading && (
            <div className="pb-2">
              {/* 🌍 Local Stablecoins — featured */}
              {locals.length > 0 && (
                <>
                  <SectionHeader label="🌍 Local Stablecoins" />
                  <div className="px-2">
                    {locals.map((t) => (
                      <TokenRow key={`${t.chainId}-${t.address}`} token={t} onSelect={onSelect} />
                    ))}
                  </div>
                </>
              )}

              {/* 💵 USD Stablecoins */}
              {usds.length > 0 && (
                <>
                  <SectionHeader label="💵 USD Stablecoins" />
                  <div className="px-2">
                    {usds.map((t) => (
                      <TokenRow key={`${t.chainId}-${t.address}`} token={t} onSelect={onSelect} />
                    ))}
                  </div>
                </>
              )}

              {/* All other tokens */}
              {others.length > 0 && (
                <>
                  <SectionHeader label={`All Tokens (${others.length})`} />
                  <div className="px-2">
                    {others.map((t) => (
                      <TokenRow key={`${t.chainId}-${t.address}`} token={t} onSelect={onSelect} />
                    ))}
                  </div>
                </>
              )}

              {locals.length === 0 && usds.length === 0 && others.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No tokens available for this chain.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
