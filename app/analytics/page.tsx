// Analytics page — KV data will be wired in after Vercel KV is connected
export default function AnalyticsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
      <p className="text-gray-500 mb-8">Live swap volume, revenue, and pair activity.</p>

      {/* Placeholder stats — replace with KV data once connected */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Volume',  value: '—',   sub: 'Connect Vercel KV to track' },
          { label: 'Fees Earned',   value: '—',   sub: '0.30% per swap' },
          { label: 'Unique Wallets',value: '—',   sub: 'Since launch' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#141414] border border-gray-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm font-medium text-gray-300">{label}</div>
            <div className="text-xs text-gray-600 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#141414] border border-gray-800 rounded-xl p-6 text-center text-gray-500">
        <p className="mb-2">📊 Connect Vercel KV to see live data</p>
        <p className="text-sm">
          After deploying to Vercel, add a KV database in your project settings.
          Analytics will appear here automatically.
        </p>
      </div>
    </div>
  )
}
