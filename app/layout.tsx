import type { Metadata }     from 'next'
import { WalletProvider }    from '@/components/wallet/WalletProvider'
import { ConnectButton }     from '@rainbow-me/rainbowkit'
import './globals.css'

export const metadata: Metadata = {
  title:       'Nexus Swap',
  description: 'Swap local stablecoins across emerging markets',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d0d0d] text-gray-100 antialiased">
        <WalletProvider>
          <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <a href="/swap" className="flex items-center gap-2">
                <span className="text-green-400 font-bold text-lg">⬡ Nexus Swap</span>
              </a>
              <nav className="flex items-center gap-4">
                <a href="/swap" className="text-sm text-gray-400 hover:text-white transition-colors">Swap</a>
              </nav>
            </div>
            <ConnectButton />
          </header>
          <main>{children}</main>
        </WalletProvider>
      </body>
    </html>
  )
}
