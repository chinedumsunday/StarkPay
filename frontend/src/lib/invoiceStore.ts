// Invoice data model — invoices are encoded in the URL, not stored server-side.
// This makes payment links work on any browser/device without a database.

export type Token = "USDC" | "STRK";

export interface Invoice {
  id: string;
  creatorAddress: string;
  creatorName: string;
  description: string;
  amount: string;
  token: Token;
  createdAt: number;
  paid: boolean;
  txHash?: string;
}

// Encode invoice data as URL-safe base64 so the link is self-contained
export function encodeInvoice(data: Omit<Invoice, "id" | "createdAt" | "paid">): string {
  const payload = {
    a: data.creatorAddress,
    n: data.creatorName,
    d: data.description,
    m: data.amount,
    t: data.token,
    ts: Date.now(),
  };
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Decode invoice from URL segment — returns null if invalid
export function decodeInvoice(encoded: string): Invoice | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const json = atob(base64 + padding);
    const p = JSON.parse(json);
    if (!p.a || !p.n || !p.d || !p.m || !p.t) return null;
    return {
      id: encoded,
      creatorAddress: p.a,
      creatorName: p.n,
      description: p.d,
      amount: p.m,
      token: p.t as Token,
      createdAt: p.ts ?? Date.now(),
      paid: false,
    };
  } catch {
    return null;
  }
}

// Local-only: track paid invoices in this browser so returning visitors see "Already Paid"
export function markInvoicePaid(id: string, txHash: string): void {
  try {
    const raw = localStorage.getItem("starkpay_paid") ?? "{}";
    const paid = JSON.parse(raw);
    paid[id] = txHash;
    localStorage.setItem("starkpay_paid", JSON.stringify(paid));
  } catch {
    // non-critical
  }
}

export function isInvoicePaid(id: string): string | null {
  try {
    const raw = localStorage.getItem("starkpay_paid") ?? "{}";
    return JSON.parse(raw)[id] ?? null;
  } catch {
    return null;
  }
}
