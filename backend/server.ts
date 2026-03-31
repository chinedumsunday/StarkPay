/**
 * StarkPay Backend Server
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PrivyClient } from "@privy-io/node";
import { createRemoteJWKSet, jwtVerify } from "jose";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "https://stark-pay-beta.vercel.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman) and all allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// ── Body parsing with size limit ─────────────────────────────
app.use(express.json({ limit: "16kb" }));

// ── Rate limiters ─────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

// Stricter limit for signing — prevents brute-force / wallet draining attempts
const signLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signing requests, please wait." },
});

app.use(generalLimiter);

// ── Privy client ──────────────────────────────────────────────
const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const PRIVY_AUTH_PRIVATE_KEY = process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY;
const PRIVY_KEY_QUORUM_ID = process.env.PRIVY_KEY_QUORUM_ID;

if (!PRIVY_AUTH_PRIVATE_KEY) console.warn("⚠️  PRIVY_AUTHORIZATION_PRIVATE_KEY is not set");
if (!PRIVY_KEY_QUORUM_ID) console.warn("⚠️  PRIVY_KEY_QUORUM_ID is not set");

// ── Input validation helpers ──────────────────────────────────
function isValidHex(value: string): boolean {
  return typeof value === "string" && /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function isValidWalletId(value: string): boolean {
  return typeof value === "string" && /^[a-z0-9_]{8,64}$/.test(value);
}

// ── Verify access token and return user_id ────────────────────
const PRIVY_JWKS_URL = `https://auth.privy.io/api/v1/apps/${process.env.PRIVY_APP_ID}/jwks.json`;
console.log("[boot] JWKS URL:", PRIVY_JWKS_URL);
const PRIVY_JWKS = createRemoteJWKSet(new URL(PRIVY_JWKS_URL));

async function verifyToken(raw: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(raw, PRIVY_JWKS, {
      issuer: "privy.io",
      audience: process.env.PRIVY_APP_ID!,
    });
    console.log("[auth] verified user:", payload.sub);
    return payload.sub ?? null;
  } catch (e: any) {
    console.error("[auth] token verification failed:", e?.code, e?.message ?? e);
    return null;
  }
}

// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "StarkPay backend running" });
});

// ── Create/Retrieve Starknet wallet ───────────────────────────
app.post("/api/wallet/starknet", async (req, res) => {
  const raw = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  if (!raw) return res.status(401).json({ error: "Missing token" });

  const user_id = await verifyToken(raw);
  if (!user_id) return res.status(401).json({ error: "Invalid or expired token" });

  try {
    const existing = await privy.wallets().list({ user_id, chain_type: "starknet" });

    // Use a wallet that already has the server key quorum as signer
    const signerWallet = existing.data.find(
      (w) => !PRIVY_KEY_QUORUM_ID ||
        w.additional_signers?.some((s: any) => s.signer_id === PRIVY_KEY_QUORUM_ID)
    );

    let wallet;
    if (signerWallet) {
      wallet = signerWallet;
    } else {
      wallet = await privy.wallets().create({
        chain_type: "starknet",
        owner: { user_id },
        ...(PRIVY_KEY_QUORUM_ID && {
          additional_signers: [{ signer_id: PRIVY_KEY_QUORUM_ID }],
        }),
      });
      console.log("[wallet] created:", wallet.id, "for user:", user_id);
    }

    res.json({
      wallet: {
        id: wallet.id,
        address: wallet.address,
        publicKey: wallet.public_key,
      },
    });
  } catch (err: any) {
    console.error("Wallet error:", err?.message ?? err);
    res.status(500).json({ error: "Failed to initialize wallet" });
  }
});

// ── Transaction Signing (TEE) ─────────────────────────────────
app.post("/api/wallet/sign", signLimiter, async (req, res) => {
  const { walletId, hash } = req.body;
  const raw = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();

  // Input validation
  if (!raw) return res.status(401).json({ error: "Missing token" });
  if (!walletId || !hash) return res.status(400).json({ error: "walletId and hash are required" });
  if (!isValidWalletId(walletId)) return res.status(400).json({ error: "Invalid walletId format" });
  if (!isValidHex(hash)) return res.status(400).json({ error: "Invalid hash format — must be 0x-prefixed hex" });

  const user_id = await verifyToken(raw);
  if (!user_id) return res.status(401).json({ error: "Invalid or expired token" });

  // Security: verify this wallet actually belongs to the requesting user
  // This prevents a user from tricking the server into signing for someone else's wallet
  try {
    const userWallets = await privy.wallets().list({ user_id, chain_type: "starknet" });
    const ownsWallet = userWallets.data.some((w) => w.id === walletId);
    if (!ownsWallet) {
      console.warn(`[sign] SECURITY: user ${user_id} tried to sign with wallet ${walletId} they don't own`);
      return res.status(403).json({ error: "Wallet does not belong to this user" });
    }
  } catch (err: any) {
    console.error("[sign] wallet ownership check failed:", err?.message);
    return res.status(500).json({ error: "Failed to verify wallet ownership" });
  }

  if (!PRIVY_AUTH_PRIVATE_KEY) {
    return res.status(500).json({ error: "Server authorization key not configured" });
  }

  try {
    const result = await privy.wallets().rawSign(walletId, {
      params: { hash },
      authorization_context: {
        authorization_private_keys: [PRIVY_AUTH_PRIVATE_KEY],
      },
    });
    console.log("[sign] succeeded for user:", user_id, "wallet:", walletId);
    res.json({ signature: result.signature });
  } catch (signErr: any) {
    console.error("[sign] Privy rawSign failed:", signErr?.status, signErr?.message ?? signErr);
    res.status(signErr?.status || 500).json({ error: signErr?.message ?? "Signing failed" });
  }
});

// ── AVNU Paymaster proxy ──────────────────────────────────────
const AVNU_URL =
  process.env.AVNU_PAYMASTER_URL || "https://sepolia.paymaster.avnu.fi";

app.post("/api/paymaster", async (req, res) => {
  try {
    const r = await fetch(AVNU_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.AVNU_API_KEY && {
          "x-paymaster-api-key": process.env.AVNU_API_KEY,
        }),
      },
      body: JSON.stringify(req.body),
    });
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "Paymaster unavailable" });
  }
});

// ── 404 catch-all ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`✅ StarkPay backend running on port ${PORT}`);
});
