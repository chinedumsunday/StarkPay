// Starkzap SDK integration helpers
// Docs: https://docs.starknet.io/build/starkzap/overview

import {
  StarkZap,
  OnboardStrategy,
  accountPresets,
  Amount,
  fromAddress,
  getPresets,
  ChainId,
  type WalletInterface,
} from "starkzap";
import type { Token } from "./invoiceStore";

// We use mainnet for the bounty submission. Change to "sepolia" for testing.
const NETWORK = (import.meta.env.VITE_NETWORK as "mainnet" | "sepolia") || "sepolia";
const PRIVY_SERVER_URL = import.meta.env.VITE_PRIVY_SERVER_URL || "http://localhost:3001";

const AVNU_API_KEY = import.meta.env.VITE_AVNU_API_KEY || "";
// These are JSON-RPC endpoints (used by starknet.js PaymasterRpc), not REST API URLs
const AVNU_PAYMASTER_URL =
  NETWORK === "mainnet"
    ? "https://starknet.paymaster.avnu.fi"
    : "https://sepolia.paymaster.avnu.fi";

export const sdk = new StarkZap({
  network: NETWORK,
  paymaster: {
    nodeUrl: AVNU_PAYMASTER_URL,
    headers: { "x-paymaster-api-key": AVNU_API_KEY },
  },
});

/**
 * Onboard a user wallet via Privy (email/social login, no seed phrase).
 * Privy securely manages the private key server-side.
 *
 * @param getAccessTokenFn - `getAccessToken` from `usePrivy()` hook.
 *   Used as the Bearer token for your backend. The backend authorizes TEE
 *   signing via a registered server-side authorization key — not user JWTs.
 */
export async function connectWithPrivy(
  getAccessTokenFn: () => Promise<string | null>
): Promise<WalletInterface> {
  const { wallet } = await sdk.onboard({
    strategy: OnboardStrategy.Privy,
    accountPreset: accountPresets.argentXV050,
    deploy: "never",
    privy: {
      resolve: async () => {
        const accessToken = await getAccessTokenFn();
        if (!accessToken) throw new Error("Not authenticated — cannot resolve wallet");

        const res = await fetch(`${PRIVY_SERVER_URL}/api/wallet/starknet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) throw new Error("Failed to resolve Privy wallet");
        const data = await res.json();

        return {
          walletId: data.wallet.id,
          publicKey: data.wallet.publicKey,
          serverUrl: `${PRIVY_SERVER_URL}/api/wallet/sign`,
          // Pass headers as a function so a fresh token is fetched on every sign call
          headers: async () => {
            const token = await getAccessTokenFn();
            if (!token) throw new Error("Session expired — please log in again");
            return { Authorization: `Bearer ${token}` };
          },
        };
      },
    },
  });
  return wallet;
}

/**
 * Get USDC or STRK token preset for the current network.
 */
export function getToken(symbol: Token) {
  const presets = getPresets(NETWORK === "mainnet" ? ChainId.MAINNET : ChainId.SEPOLIA);
  return symbol === "USDC" ? presets.USDC : presets.STRK;
}

/**
 * Pay an invoice — transfers tokens from payer to creator.
 * Deploys the account first if needed (using STRK for gas), then transfers.
 */
export async function payInvoice(
  wallet: WalletInterface,
  recipientAddress: string,
  amount: string,
  tokenSymbol: Token
): Promise<{ hash: string; explorerUrl: string }> {
  const token = getToken(tokenSymbol);
  const recipient = fromAddress(recipientAddress);
  const parsedAmount = Amount.parse(amount, token);

  const balance = await wallet.balanceOf(token);
  if (balance.lt(parsedAmount)) {
    throw new Error(
      `Insufficient ${tokenSymbol} balance. You have ${balance.toFormatted(true)} but need ${parsedAmount.toFormatted(true)}.`
    );
  }

  // Deploy account if not yet on-chain, paying gas from the wallet's own STRK.
  await wallet.ensureReady({ deploy: "if_needed", feeMode: "user_pays" });

  // Account is now deployed — use gasless sponsored transfer via AVNU.
  const tx = await wallet.transfer(
    token,
    [{ to: recipient, amount: parsedAmount }],
    { feeMode: "sponsored" }
  );

  await tx.wait();

  return {
    hash: tx.hash,
    explorerUrl: tx.explorerUrl,
  };
}

/**
 * Get wallet balance for a given token.
 */
export async function getBalance(wallet: WalletInterface, tokenSymbol: Token): Promise<string> {
  const token = getToken(tokenSymbol);
  const balance = await wallet.balanceOf(token);
  return balance.toFormatted(true);
}
