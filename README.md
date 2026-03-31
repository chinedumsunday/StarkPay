# StarkPay — Gasless Invoice Payments on Starknet

> **Submitted to the [WP1 Developer Bounty](https://www.thewp1.xyz/DeveloperBounty) · Builder Track**

**Live Demo:** [stark-pay-beta.vercel.app](https://stark-pay-beta.vercel.app)

StarkPay lets anyone create a shareable payment link and get paid onchain in seconds — **without their clients needing a wallet, seed phrase, or gas tokens**. Clients pay with just their email.

---

## The Problem

Getting paid as a freelancer or creator across borders is broken:

- PayPal charges 3–5% fees and blocks many countries
- Wire transfers take 3–5 business days and cost $30+
- Crypto payments require clients to set up a wallet, buy gas, and understand seed phrases

## The Solution

StarkPay turns crypto payments into a **Web2 UX**:

| Before | After |
|--------|-------|
| "Install MetaMask, buy ETH, add Starknet network..." | Share a link |
| Client needs to manage seed phrases | Client logs in with Gmail / email OTP |
| Client pays gas fees | Gas is 100% sponsored — $0 for client |
| Settlement: 3–5 days | Settlement: ~10 seconds on Starknet |

---

## Live Flow

```
Creator (Payee)                     Client (Payer)
      │                                   │
      ▼                                   ▼
 Fill invoice form             Click short payment link
      │                                   │
      ▼                                   ▼
 Get short link + QR code      Login with email (Privy)
 Share anywhere                           │
                               Starknet wallet auto-created
                                          │
                               One-click gasless payment
                                          │
                               Confirmed on-chain (~10s)
                                          │
 Receive USDC / STRK  ◄───────────────────┘
```

---

## Features

- **Gasless payments** — AVNU Paymaster sponsors all gas fees
- **Email / social login** — clients need zero crypto knowledge
- **Short payment links** — `starkpay.app/pay/a3f9k2m` not a 200-char URL
- **QR code** — scannable from any device
- **Native share sheet** — share link + QR to WhatsApp, Telegram, email, etc.
- **USDC & STRK** — both tokens supported
- **App wallet or external** — creators can receive to their Privy wallet or any Starknet address
- **Wallet management** — fund, swap, and export your embedded wallet
- **TEE-secured signing** — private keys never leave Privy's Trusted Execution Environment
- **Mainnet live** — fully deployed and working on Starknet mainnet

---

## Starkzap SDK Integration

| Feature | SDK Usage |
|---------|-----------|
| Email / social login | `OnboardStrategy.Privy` |
| Auto wallet creation | `sdk.onboard({ deploy: "if_needed" })` |
| Gasless transfers | `wallet.transfer(..., { feeMode: "sponsored" })` |
| Balance checking | `wallet.balanceOf(token)` |
| USDC & STRK support | `getPresets()`, `Amount.parse()` |
| Tx confirmation | `tx.wait()` + `tx.explorerUrl` |

### Core payment code

```typescript
// 1. Onboard user wallet via email login (no seed phrase ever)
const { wallet } = await sdk.onboard({
  strategy: OnboardStrategy.Privy,
  accountPreset: accountPresets.argentXV050,
  deploy: "never",
  privy: {
    resolve: async () => ({
      walletId: data.wallet.id,
      publicKey: data.wallet.publicKey,
      serverUrl: `${BACKEND_URL}/api/wallet/sign`,
      // Fresh token fetched on every sign call
      headers: async () => ({ Authorization: `Bearer ${await getAccessToken()}` }),
    }),
  },
});

// 2. Execute gasless transfer — AVNU Paymaster covers all fees
const tx = await wallet.transfer(
  USDC,
  [{ to: fromAddress(recipientAddress), amount: Amount.parse("100", USDC) }],
  { feeMode: "sponsored" }
);

await tx.wait();
// tx.explorerUrl → https://voyager.online/tx/0x...
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Starknet SDK | [Starkzap](https://starkzap.io) |
| Wallet auth | [Privy](https://privy.io) — TEE-secured embedded wallets |
| Gas sponsorship | [AVNU Paymaster](https://avnu.fi) via Starkzap |
| Backend | Node.js + Express (JWT verification, TEE signing proxy) |
| Security | Helmet, rate limiting, wallet ownership checks |
| Frontend deploy | Vercel |
| Backend deploy | Railway |

---

## Project Structure

```
starkpay/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx            # Landing page
│       │   ├── CreateInvoice.tsx   # Creator fills invoice, gets link + QR
│       │   ├── PayInvoice.tsx      # Payer flow (Starkzap core)
│       │   ├── Wallet.tsx          # Wallet management (fund, swap, export)
│       │   └── Success.tsx         # Confirmation + Voyager explorer link
│       └── lib/
│           ├── starkzap.ts         # SDK integration (onboard, pay, balance)
│           └── invoiceStore.ts     # Invoice API client
├── backend/
│   └── server.ts                   # Express: Privy TEE signing + invoice store
├── vercel.json                     # Vercel SPA routing config
└── railway.json                    # Railway deploy config
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- [Privy](https://dashboard.privy.io) account (free tier works)
- Privy Authorization key (Settings → Authorization → Create key)

### 1. Clone

```bash
git clone https://github.com/chinedumsunday/StarkPay.git
cd StarkPay
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

```env
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
PRIVY_AUTHORIZATION_PRIVATE_KEY=wallet-auth:your-key-here
PRIVY_KEY_QUORUM_ID=your-quorum-id
AVNU_PAYMASTER_URL=https://sepolia.paymaster.avnu.fi
FRONTEND_URL=http://localhost:5173
PORT=3001
```

```bash
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `.env`:

```env
VITE_PRIVY_APP_ID=your-privy-app-id
VITE_PRIVY_SERVER_URL=http://localhost:3001
VITE_NETWORK=sepolia
```

```bash
npm run dev
```

Open `http://localhost:5173`

### 4. Test the flow

1. Go to `/create` → fill invoice → choose app wallet or paste external address
2. Copy the short link or scan the QR code
3. Open in a new browser → click "Login to Pay"
4. Sign in with email → wallet auto-created
5. Click "Pay" → gasless transfer lands on-chain in ~10 seconds

---

## Deployment

### Frontend → Vercel

Set these environment variables in Vercel dashboard:

| Variable | Value |
|----------|-------|
| `VITE_PRIVY_APP_ID` | Your Privy App ID |
| `VITE_PRIVY_SERVER_URL` | Your Railway backend URL |
| `VITE_NETWORK` | `mainnet` or `sepolia` |

### Backend → Railway

Set these environment variables in Railway dashboard:

| Variable | Value |
|----------|-------|
| `PRIVY_APP_ID` | Your Privy App ID |
| `PRIVY_APP_SECRET` | Your Privy App Secret |
| `PRIVY_AUTHORIZATION_PRIVATE_KEY` | `wallet-auth:...` |
| `PRIVY_KEY_QUORUM_ID` | From Privy Authorization settings |
| `AVNU_PAYMASTER_URL` | `https://starknet.paymaster.avnu.fi` (mainnet) |
| `FRONTEND_URL` | Your Vercel URL |

---

## Security

- **TEE signing** — Privy private keys never leave the Trusted Execution Environment; the backend signs via a registered key quorum, never with user JWTs
- **Wallet ownership verification** — backend checks every sign request belongs to the authenticated user before signing
- **Rate limiting** — 100 req/15min globally, 10 req/1min on the sign endpoint
- **JWT verification** — all protected routes verify Privy access tokens via JWKS
- **Input validation** — all addresses and hashes validated before processing
- **Helmet** — standard HTTP security headers on all responses

---

## License

MIT — free to use, fork, and build on.

---

*Built with the [Starkzap SDK](https://starkzap.io) · Submitted to the [WP1 Developer Bounty](https://www.thewp1.xyz/DeveloperBounty)*
