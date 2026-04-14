import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] text-center px-4">
      <div className="max-w-xl">
        <h1 className="text-4xl font-bold text-white mb-4">
          Swap local stablecoins.<br />
          <span className="text-green-400">Keep your purchasing power.</span>
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Access the best rates for Brazilian Real, Mexican Peso, Euro, and more —
          directly from your wallet.
        </p>
        <Link
          href="/swap"
          className="inline-block bg-green-500 hover:bg-green-400 text-black font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Launch Swap →
        </Link>
        <div className="mt-12 grid grid-cols-3 gap-6 text-sm">
          {[
            { label: 'Fee',         value: '0.30%',       color: 'text-yellow-400' },
            { label: 'Aggregator',  value: '0x Protocol', color: 'text-blue-400'   },
            { label: 'Networks',    value: 'Polygon + L2s', color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`font-semibold ${color}`}>{value}</div>
              <div className="text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
