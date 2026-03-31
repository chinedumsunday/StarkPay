// Invoice data model and simple localStorage store
// In production, replace with a real database (Supabase, PlanetScale, etc.)

export type Token = "USDC" | "STRK";

export interface Invoice {
  id: string;
  creatorAddress: string; // Starknet address that will receive funds
  creatorName: string;
  description: string;
  amount: string; // human readable e.g. "100"
  token: Token;
  createdAt: number;
  paid: boolean;
  txHash?: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function createInvoice(data: Omit<Invoice, "id" | "createdAt" | "paid">): Invoice {
  const invoice: Invoice = {
    ...data,
    id: generateId(),
    createdAt: Date.now(),
    paid: false,
  };
  const invoices = getAllInvoices();
  invoices[invoice.id] = invoice;
  localStorage.setItem("starkpay_invoices", JSON.stringify(invoices));
  return invoice;
}

export function getInvoice(id: string): Invoice | null {
  const invoices = getAllInvoices();
  return invoices[id] || null;
}

export function markInvoicePaid(id: string, txHash: string): void {
  const invoices = getAllInvoices();
  if (invoices[id]) {
    invoices[id].paid = true;
    invoices[id].txHash = txHash;
    localStorage.setItem("starkpay_invoices", JSON.stringify(invoices));
  }
}

function getAllInvoices(): Record<string, Invoice> {
  try {
    const raw = localStorage.getItem("starkpay_invoices");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
