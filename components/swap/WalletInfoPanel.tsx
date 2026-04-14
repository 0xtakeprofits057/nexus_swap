'use client'

import { useAccount, useChainId } from 'wagmi'
import { ConnectButton }           from '@rainbow-me/rainbowkit'
import { useTokenList }            from '@/hooks/useTokenList'
import { useTokenBalance }         from '@/hooks/useTokenBalance'
import { formatTokenAmount }       from '@/lib/format'
import { CHAIN_NAMES }             from '@/lib/chains'
import type { Token }              from '@/lib/providers/types'

function BalanceRow({ token }: { token: Token }) {
  const { balance, isLoading } = useTokenBalance(token)

  return (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-gray-800/50 rounded-lg transition-colors">
      <div className="flex items-center gap-2.5">
        {token.logoURI ? (
          <img src={token.logoURI} alt={token.symbol} className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
            {token.symbol.slice(0, 2)}
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-white flex items-center gap-1.5">
            {token.symbol}
            {token.currency && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">
                {token.currency}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">{token.name}</div>
        </div>
      </div>
      <div className="text-sm text-gray-300 font-medium tabular-nums">
        {isLoading ? (
          <div className="w-12 h-4 bg-gray-700 rounded animate-pulse" />
        ) : balance > 0n ? (
          formatTokenAmount(balance, token.decimals, 4)
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </div>
    </div>
  )
}

export function WalletInfoPanel() {
  const { address, isConnected } = useAccount()
  const chainId                  = useChainId()
  const { allTokens, localStables, usdStables } = useTokenList()

  if (!isConnected) {
    return (
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🌍</div>
        <h3 className="text-white font-semibold text-lg mb-2">Swap Local Stablecoins</h3>
        <p className="text-gray-500 text-sm mb-6">
          Connect your wallet to swap between USDC, Brazilian Real, Mexican Peso, Euro, and more.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
        <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
          {[
            { label: 'Fee',        value: '0.30%',        color: 'text-yellow-400' },
            { label: 'Aggregator', value: '0x Protocol',  color: 'text-blue-400'   },
            { label: 'Networks',   value: '5 chains',     color: 'text-green-400'  },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className={`font-semibold ${color}`}>{value}</div>
              <div className="text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const chainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`

  return (
    <div className="space-y-4">
      {/* Wallet info */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Connected Wallet</span>
          <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">{chainName}</span>
        </div>
        <div className="text-sm font-mono text-gray-300 truncate">
          {address}
        </div>
      </div>

      {/* Balances */}
      <div className="bg-[#141414] border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Balances</span>
          <span className="text-xs text-gray-600">{chainName}</span>
        </div>

        {allTokens.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">
            No tokens available on {chainName}.<br />Switch chain to see tokens.
          </p>
        ) : (
          <div className="space-y-0.5">
            {localStables.length > 0 && (
              <>
                <div className="text-xs text-gray-600 uppercase tracking-wider px-3 pt-1 pb-1">
                  🌍 Local Stablecoins
                </div>
                {localStables.map((token) => (
                  <BalanceRow key={token.address} token={token} />
                ))}
              </>
            )}
            {usdStables.length > 0 && (
              <>
                <div className="text-xs text-gray-600 uppercase tracking-wider px-3 pt-2 pb-1">
                  💵 USD Stablecoins
                </div>
                {usdStables.map((token) => (
                  <BalanceRow key={token.address} token={token} />
                ))}
              </>
            )}
            {allTokens.filter(t => t.category === 'major').length > 0 && (
              <>
                <div className="text-xs text-gray-600 uppercase tracking-wider px-3 pt-2 pb-1">
                  Major Tokens
                </div>
                {allTokens.filter(t => t.category === 'major').map((token) => (
                  <BalanceRow key={token.address} token={token} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
