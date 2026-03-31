# Twitter / X Submission Thread

Post these as a thread. Tweet 1 is the main submission tweet.

---

**Tweet 1 (MAIN — include this link to qualify):**

Built @StarkPay for the @Starknet #Starkzap bounty 🧵

Get paid onchain. Your client needs zero crypto experience.

• No seed phrases → email login via Privy
• No gas fees → sponsored by AVNU Paymaster  
• Create a payment link in 30 seconds
• Client pays in USDC or STRK

Live demo 👇 [LINK]
GitHub 👇 [LINK]

#Starknet #Starkzap #Web3

---

**Tweet 2:**

The problem: getting paid as a freelancer across borders sucks

PayPal = 3-5% fees, blocks African/Asian accounts
Wire = 3-5 days, $25+ fee
Crypto = "install MetaMask, buy ETH, bridge to Starknet..."

There had to be a better way 👇

---

**Tweet 3:**

The flow I built with @Starkzap SDK:

1️⃣ Freelancer fills a form → gets shareable link
2️⃣ Client clicks link → logs in with Gmail (no wallet)
3️⃣ Starkzap auto-creates their Starknet wallet
4️⃣ One-click payment → gasless, confirmed in ~10s

That's it. That's the whole UX.

---

**Tweet 4:**

Tech stack under the hood:

→ @Starkzap SDK for wallet + transfer
→ @privy_io for email/social login (no seed phrases)
→ @avnu_fi Paymaster for sponsored gas
→ OnboardStrategy.Privy + feeMode: "sponsored"
→ React + Vite frontend, Express backend

5 SDK modules. All working together.

---

**Tweet 5:**

The key Starkzap code that makes it work:

```
const { wallet } = await sdk.onboard({
  strategy: OnboardStrategy.Privy,
  deploy: "if_needed",    ← auto wallet creation
});

await wallet.transfer(USDC, [{ to: recipient,
  amount: Amount.parse("100", USDC) }],
  { feeMode: "sponsored" }   ← gasless ⛽
);
```

This is what web3 onboarding should look like.

---

**Tweet 6:**

Repo is fully open source. Plain-English README, clean code structure.

Fork it, extend it, ship your own version.

@Starknet @StarkWareLtd

GitHub: [LINK]
Live: [LINK]

Built for the #Starkzap Developer Bounty Week 1 🔥
