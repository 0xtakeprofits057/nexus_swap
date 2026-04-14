import { SwapCard }        from '@/components/swap/SwapCard'
import { WalletInfoPanel } from '@/components/swap/WalletInfoPanel'

export default function SwapPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-6 items-start">
        {/* Left: swap form */}
        <div className="w-[440px] shrink-0">
          <SwapCard />
        </div>
        {/* Right: balances + info */}
        <div className="flex-1 min-w-0">
          <WalletInfoPanel />
        </div>
      </div>
    </div>
  )
}
