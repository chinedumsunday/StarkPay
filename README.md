# StarkPay — Onchain Invoice & Payment Links

> **Built for the [Starkzap Developer Bounty](https://starkzap.io) · Builder Track**

StarkPay lets freelancers create shareable payment links and get paid onchain — **without their clients needing a wallet, seed phrase, or gas tokens**.

**Live Demo:** [starkpay.vercel.app](https://starkpay.vercel.app) <!-- update after deploy -->

---

## The Problem

Getting paid as a freelancer across borders is painful:
- PayPal has 3–5% fees and blocks many countries
- Wire transfers take 3–5 business days
- Crypto payments require clients to set up a wallet

## The Solution

StarkPay turns crypto payments into a **Web2 experience**:

| Before | After |
|--------|-------|
| "Install MetaMask, buy ETH, add Starknet network..." | Share a link |
| Client needs to understand seed phrases | Client logs in with Gmail |
| Client pays gas fees | Gas is sponsored — $0 for client |
| Settlement: 3-5 days | Settlement: ~10 seconds |

---

## How It Works

```
Freelancer                          Client (Payer)
    │                                    │
    ▼                                    ▼
Fill invoice form              Click payment link
    │                                    │
    ▼                                    ▼
Get shareable link ──────────► Login with email (Privy)
                                         │
                               Wallet auto-created on Starknet
                                         │
                               One-click payment (gasless)
                                         │
                               Tx confirmed on Starknet (~10s)
                                         │
Freelancer receives USDC/STRK ◄──────────┘
```

---

## Starkzap SDK Integration

This project uses the following Starkzap SDK modules:

| Feature | SDK Usage |
|---------|-----------|
| **Email/social login** | `OnboardStrategy.Privy` |
| **Auto wallet creation** | `sdk.onboard({ deploy: "if_needed" })` |
| **Gasless payments** | `wallet.transfer(..., { feeMode: "sponsored" })` |
| **Balance checking** | `wallet.balanceOf(token)` |
| **USDC & STRK support** | `getPresets()`, `Amount.parse()` |
| **Tx confirmation** | `tx.wait()` + `tx.explorerUrl` |

### Key code — the payment flow

```typescript
// 1. Connect wallet via email login (no seed phrase)
const { wallet } = await sdk.onboard({
  strategy: OnboardStrategy.Privy,
  accountPreset: accountPresets.argentXV050,
  deploy: "if_needed",      // creates wallet if first time
  privy: { resolve: ... },
});

// 2. Execute gasless transfer to freelancer
const tx = await wallet.transfer(
  USDC,
  [{ to: fromAddress(creatorAddress), amount: Amount.parse("100", USDC) }],
  { feeMode: "sponsored" }  // AVNU Paymaster covers gas
);

await tx.wait();
console.log(tx.explorerUrl); // https://voyager.online/tx/0x...
```

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Starknet SDK:** [Starkzap](https://starkzap.io)
- **Wallet Auth:** [Privy](https://privy.io) (email/social login, server-side key management)
- **Gas Sponsorship:** [AVNU Paymaster](https://avnu.fi) via Starkzap
- **Deployment:** Vercel (frontend) + Railway (backend)

---

## Running Locally

### Prerequisites
- Node.js 18+
- A [Privy](https://dashboard.privy.io) account (free)
- A Starknet wallet address to receive test payments

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/starkpay
cd starkpay
```

### 2. Start the backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in PRIVY_APP_ID and PRIVY_APP_SECRET from dashboard.privy.io
npx tsx server.ts
```

### 3. Start the frontend

```bash
cd frontend
npm install
cp .env.example .env
# Fill in VITE_PRIVY_APP_ID (same App ID as backend)
npm run dev
```

Open `http://localhost:5173`

### 4. Test the flow

1. Go to `/create` → fill in your Starknet address → get a payment link
2. Open the payment link → click "Login to Pay"
3. Sign in with email → wallet is auto-created on Sepolia
4. Confirm payment → watch it land on Voyager

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Set environment variables in Vercel dashboard
```

### Backend → Railway

```bash
cd backend
# Connect to Railway, set env vars, deploy
```

---

## Project Structure

```
starkpay/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx          # Landing page
│       │   ├── CreateInvoice.tsx # Freelancer creates invoice
│       │   ├── PayInvoice.tsx    # Payer pays (Starkzap core flow)
│       │   └── Success.tsx       # Confirmation + Voyager link
│       └── lib/
│           ├── starkzap.ts       # SDK integration helpers
│           └── invoiceStore.ts   # Invoice data (localStorage)
└── backend/
    └── server.ts                 # Express + Privy signing server
```

---

## Why This Wins

- **Real usefulness** — solves a genuine cross-border payment problem
- **Meaningful Starkzap integration** — 5 SDK modules used, not just `connectWallet()`
- **Before/after UX story** — perfect for the livestream demo
- **Open source + reusable** — other developers can fork and extend

---

## License

MIT — free to use, fork, and build on.

---

*Built with ❤️ using the [Starkzap SDK](https://starkzap.io) · Submitted to the Starkzap Developer Bounty*
