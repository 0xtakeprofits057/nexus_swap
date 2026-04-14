// ─── Token amounts ─────────────────────────────────────────────────────────────

export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  displayDecimals = 4
): string {
  const divisor = 10n ** BigInt(decimals)
  const whole   = amount / divisor
  const frac    = amount % divisor

  const fracStr = frac.toString().padStart(decimals, '0').slice(0, displayDecimals)
  const trimmed = fracStr.replace(/0+$/, '')

  return trimmed.length > 0 ? `${whole}.${trimmed}` : `${whole}`
}

export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!value || value === '.') return 0n
  const [whole, frac = ''] = value.split('.')
  const fracPadded = frac.slice(0, decimals).padEnd(decimals, '0')
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(fracPadded || '0')
}

// ─── USD values ───────────────────────────────────────────────────────────────

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ─── Percentages ──────────────────────────────────────────────────────────────

export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// ─── Price impact color ───────────────────────────────────────────────────────

export function priceImpactColor(impactPercent: number): string {
  if (impactPercent < 0.1) return 'text-green-400'
  if (impactPercent < 0.5) return 'text-yellow-400'
  if (impactPercent < 3.0) return 'text-orange-400'
  return 'text-red-500'
}
