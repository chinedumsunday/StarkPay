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

const SERVER_URL = import.meta.env.VITE_PRIVY_SERVER_URL || "http://localhost:3001";

// Create invoice on backend — returns a short 7-char ID
export async function createInvoice(
  data: Omit<Invoice, "id" | "createdAt" | "paid">
): Promise<string> {
  const res = await fetch(`${SERVER_URL}/api/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create invoice");
  const { id } = await res.json();
  return id;
}

// Fetch invoice from backend by short ID
export async function getInvoice(id: string): Promise<Invoice | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/invoice/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { ...data, id, paid: false };
  } catch {
    return null;
  }
}

// Local-only: track paid invoices in this browser
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
