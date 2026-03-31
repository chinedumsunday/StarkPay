# Setup Guide — StarkPay & StarkRemit

Everything you need to go from zero to deployed and submitted for the bounty.

---

## Prerequisites

Install Node.js (v18 or higher):
- Download from https://nodejs.org → choose "LTS" version
- Verify: open terminal and run `node --version` → should show v18+

---

## Step 1 — Create Your Accounts (all free)

### Privy (wallet + login system)
1. Go to https://dashboard.privy.io
2. Sign up → click "Create App"
3. Name it "StarkPay" (repeat separately for StarkRemit)
4. Go to Settings → copy your **App ID** and **App Secret**
5. Under "Login Methods" → enable Email and Google

### GitHub
1. Go to https://github.com → sign up if needed
2. Create a new repo called `starkpay` → set to **Public**
3. Create a second repo called `starkremit` → set to **Public**

### Vercel (frontend hosting)
1. Go to https://vercel.com → sign up with GitHub

### Railway (backend hosting)
1. Go to https://railway.app → sign up with GitHub

---

## Step 2 — Run StarkPay Locally

### Terminal 1 — Backend
```bash
cd starkpay/backend
npm install
cp .env.example .env
```

Open `.env` and fill in:
```
PRIVY_APP_ID=your-app-id-from-privy
PRIVY_APP_SECRET=your-app-secret-from-privy
```

Then start it:
```bash
npm run dev
# Should print: ✅ StarkPay backend running on http://localhost:3001
```

### Terminal 2 — Frontend
```bash
cd starkpay/frontend
npm install
cp .env.example .env
```

Open `.env` and fill in:
```
VITE_PRIVY_APP_ID=your-app-id-from-privy
VITE_NETWORK=sepolia
VITE_PRIVY_SERVER_URL=http://localhost:3001
```

Then start it:
```bash
npm run dev
# Open http://localhost:5173
```

### Test the Flow
1. Go to http://localhost:5173/create
2. Fill the form — use any Starknet address starting with 0x
   (Don't have one? Get a free Braavos wallet at https://braavos.app)
3. Copy the payment link → open it in a new tab
4. Click "Login to Pay" → enter your email
5. A Starknet wallet is auto-created for you by Privy
6. Fund it with test tokens: https://starknet-faucet.vercel.app
   (paste your new wallet address → request STRK)
7. Come back → click Pay → transaction confirms on Starknet
8. Click "View on Voyager Explorer" to see it on-chain ✅

---

## Step 3 — Run StarkRemit Locally

Same process as StarkPay — create a **separate** Privy app for StarkRemit.

```bash
# Terminal 1
cd starkremit/backend
npm install
cp .env.example .env   # fill in new Privy keys
npm run dev

# Terminal 2
cd starkremit/frontend
npm install
cp .env.example .env   # fill in VITE_PRIVY_APP_ID
npm run dev
# Open http://localhost:5173
```

### Test the StarkRemit Flow
1. Go to `/receive` → fill in your Starknet address + amount
2. See the live NGN equivalent update as you type
3. Copy the payment link → open in a new tab
4. Login with email → wallet auto-created
5. Fund wallet from faucet → pay → see confirmed page with cashout steps

---

## Step 4 — Push to GitHub

```bash
# StarkPay
cd starkpay
git init
git add .
git commit -m "StarkPay — Onchain invoice payments built with Starkzap SDK"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/starkpay.git
git push -u origin main

# StarkRemit
cd ../starkremit
git init
git add .
git commit -m "StarkRemit — Cross-border remittances built with Starkzap SDK"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/starkremit.git
git push -u origin main
```

---

## Step 5 — Deploy Backend to Railway

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select your `starkpay` repo
3. Set the **Root Directory** to `backend`
4. Add environment variables (click "Variables"):
   ```
   PRIVY_APP_ID=your-privy-app-id
   PRIVY_APP_SECRET=your-privy-app-secret
   FRONTEND_URL=https://starkpay.vercel.app
   PORT=3001
   ```
5. Railway gives you a public URL like:
   `https://starkpay-backend-production.up.railway.app`
   → Copy this — you need it for Vercel

Repeat for StarkRemit backend.

---

## Step 6 — Deploy Frontend to Vercel

1. Go to https://vercel.com → New Project → Import your `starkpay` GitHub repo
2. Vercel will auto-detect the `vercel.json` settings
3. Add environment variables:
   ```
   VITE_PRIVY_APP_ID=your-privy-app-id
   VITE_NETWORK=mainnet
   VITE_PRIVY_SERVER_URL=https://starkpay-backend-production.up.railway.app
   ```
4. Click Deploy → get your live URL e.g. `https://starkpay.vercel.app`
5. Go back to Railway → update `FRONTEND_URL` to your Vercel URL
6. Also go to Privy dashboard → App Settings → add your Vercel URL to "Allowed Origins"

Repeat for StarkRemit frontend.

---

## Step 7 — Submit (before Friday April 3 for Week 1)

Open `TWITTER_THREAD.md` in your project — fill in your live URL and GitHub link, then post the thread.

**Critical checklist before posting:**
- [ ] Live URL works end to end on mainnet
- [ ] GitHub repo is public
- [ ] README is complete
- [ ] Tweet tags @Starknet and includes #Starkzap
- [ ] Tweet includes your live link AND GitHub link

**Week 1 (April 3):** Submit StarkPay tweet
**Week 2 (April 10):** Submit StarkRemit tweet

---

## Troubleshooting

**"Cannot find module starkzap"**
→ Run `npm install` inside the `frontend` folder, not the root

**"Privy wallet creation failed"**
→ Check that PRIVY_APP_ID and PRIVY_APP_SECRET are correct in backend `.env`
→ Make sure your Privy app has Email and Google login enabled

**"CORS error" in browser**
→ Add your frontend URL to the `origin` array in `backend/server.ts`
→ Also add it in Privy dashboard → App Settings → Allowed Origins

**"Insufficient balance" on payment**
→ You're on Sepolia — fund your wallet at https://starknet-faucet.vercel.app
→ On mainnet, you need real USDC or STRK in the wallet

**Vite build fails with "buffer not defined"**
→ Make sure `vite.config.ts` has `define: { global: "globalThis" }`
→ Run `npm install buffer` and add it to `optimizeDeps.include`

---

## Folder Structure (what you have)

```
starkpay/
├── frontend/
│   ├── src/
│   │   ├── pages/         ← Home, CreateInvoice, PayInvoice, Success
│   │   ├── lib/           ← starkzap.ts, invoiceStore.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/favicon.svg
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
├── backend/
│   ├── server.ts
│   ├── package.json
│   └── .env.example
├── vercel.json
├── .gitignore
├── README.md
└── TWITTER_THREAD.md

starkremit/               ← identical structure, different pages and lib files
```
