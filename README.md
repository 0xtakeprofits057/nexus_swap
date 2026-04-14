# Nexus Swap

A DEX aggregator front-end for local (non-USD) stablecoins across emerging markets. Users can swap USDC/USDT into Brazilian Real (BRLA), Mexican Peso (EMXN), Euro (EURS), and more — with transparent 0.30% fees routed to the treasury.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **wagmi v2** + **viem v2** — blockchain interactions
- **RainbowKit v2** — wallet connection (MetaMask, WalletConnect, Coinbase)
- **0x Swap API v2** — liquidity aggregation across Uniswap, Curve, Sushi, etc.
- **TanStack Query v5** — quote fetching and caching
- **Tailwind CSS** — styling
- **Vercel** — deployment + KV for analytics

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|---|---|
| `ZRX_API_KEY` | 0x API key from [dashboard.0x.org](https://dashboard.0x.org) |
| `TREASURY_ADDRESS` | Wallet address to receive 0.30% fees |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From [cloud.walletconnect.com](https://cloud.walletconnect.com) |

## Deploying to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add environment variables from `.env.local`
4. Add Vercel KV storage for analytics

## Adding New Local Stablecoins

Edit `tokens/local-stablecoins.json` — no code changes needed. Add an entry with:
- `address`, `symbol`, `name`, `decimals`, `chainId`
- `category: "local-stable"`
- `currency: "XXX"` (ISO currency code)
