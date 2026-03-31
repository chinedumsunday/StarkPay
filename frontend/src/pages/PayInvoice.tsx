import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { decodeInvoice, markInvoicePaid, isInvoicePaid, type Invoice } from "../lib/invoiceStore";
import { connectWithPrivy, payInvoice, getBalance } from "../lib/starkzap";
import type { WalletInterface } from "starkzap";

type Step = "loading" | "not-found" | "already-paid" | "view" | "connecting" | "paying" | "error";

export default function PayInvoice() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { login, authenticated, getAccessToken } = usePrivy();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [balance, setBalance] = useState<string>("");
  const [error, setError] = useState("");
  const [addressCopied, setAddressCopied] = useState(false);

  async function copyWalletAddress() {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address.toString());
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  }

  // Load invoice — decoded entirely from the URL, works on any browser
  useEffect(() => {
    if (!invoiceId) { setStep("not-found"); return; }
    const inv = decodeInvoice(invoiceId);
    if (!inv) { setStep("not-found"); return; }
    if (isInvoicePaid(invoiceId)) { setStep("already-paid"); return; }
    setInvoice(inv);
    setStep("view");
  }, [invoiceId]);

  // If user just authenticated, auto-connect wallet
  useEffect(() => {
    if (authenticated && !wallet && step === "connecting") {
      connectWallet();
    }
  }, [authenticated]);

  async function connectWallet() {
  if (!invoice) return;
  setStep("connecting");
  try {
    // Verify the user is authenticated before proceeding
    if (!authenticated) {
      login();
      return;
    }

    // Pass `getAccessToken` from usePrivy() — this is the real user JWT.
    // Do NOT use the standalone `getAccessToken` export from @privy-io/react-auth
    // as that is `getCustomerAccessToken` and will be rejected by Privy's signing API.
    const w = await connectWithPrivy(getAccessToken);
    setWallet(w);
    
    const bal = await getBalance(w, invoice.token);
    setBalance(bal);
    setStep("paying");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setError(msg);
    setStep("error");
  }
}

  async function handlePay() {
    if (!invoice || !wallet) return;
    setStep("paying");
    setError("");
    try {
      const result = await payInvoice(wallet, invoice.creatorAddress, invoice.amount, invoice.token);
      markInvoicePaid(invoice.id, result.hash);
      navigate("/success", {
        state: {
          txHash: result.hash,
          explorerUrl: result.explorerUrl,
          amount: invoice.amount,
          token: invoice.token,
          description: invoice.description,
          creatorName: invoice.creatorName,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep("error");
    }
  }

  function handleConnectClick() {
    if (!authenticated) {
      setStep("connecting");
      login();
    } else {
      connectWallet();
    }
  }

  // ── Render states ─────────────────────────────────────────

  if (step === "loading") {
    return (
      <div className="page" style={{ justifyContent: "center" }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (step === "not-found") {
    return (
      <div className="page">
        <header className="page-header"><Link to="/" className="logo">Stark<span>Pay</span></Link></header>
        <div className="card animate-in" style={{ textAlign: "center" }}>
          <div className="success-icon" style={{ background: "rgba(255,77,109,0.1)", borderColor: "var(--error)" }}>❌</div>
          <h2>Invoice Not Found</h2>
          <p className="subtitle">This payment link may be invalid or expired.</p>
          <Link to="/" className="btn btn-ghost">← Go Home</Link>
        </div>
      </div>
    );
  }

  if (step === "already-paid") {
    return (
      <div className="page">
        <header className="page-header"><Link to="/" className="logo">Stark<span>Pay</span></Link></header>
        <div className="card animate-in" style={{ textAlign: "center" }}>
          <div className="success-icon">✅</div>
          <h2>Already Paid</h2>
          <p className="subtitle">This invoice has already been settled on-chain.</p>
          <Link to="/" className="btn btn-ghost">← Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="logo">Stark<span>Pay</span></Link>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {authenticated && (
            <Link to="/wallet" className="btn btn-ghost" style={{ width: "auto", padding: "0.4rem 0.9rem", fontSize: "0.78rem" }}>
              My Wallet
            </Link>
          )}
          <span className="wallet-address">
            {authenticated ? "🟢 Connected" : "⚪ Not connected"}
          </span>
        </div>
      </header>

      <div className="card animate-in">
        {/* Invoice amount hero */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <span className="status-dot pending" />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
              Payment Requested
            </span>
          </div>

          <div className="amount-display">
            <span className="currency">{invoice!.token}</span>
            {invoice!.amount}
          </div>

          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {invoice!.description}
          </p>
        </div>

        <hr className="divider" />

        <div style={{ marginBottom: "1.5rem" }}>
          <div className="detail-row">
            <span className="detail-label">From</span>
            <span className="detail-value" style={{ fontFamily: "var(--sans)" }}>{invoice!.creatorName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">To (Wallet)</span>
            <span className="detail-value" style={{ fontSize: "0.7rem" }}>
              {invoice!.creatorAddress.slice(0, 12)}...{invoice!.creatorAddress.slice(-6)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Token</span>
            <span className="detail-value">
              <span className="token-badge">{invoice!.token}</span>
            </span>
          </div>
          {balance && (
            <div className="detail-row">
              <span className="detail-label">Your Balance</span>
              <span className="detail-value">{balance}</span>
            </div>
          )}
        </div>

        {step === "error" && (
          <div className="banner banner-error" style={{ marginBottom: "1.25rem" }}>
            {error || "Something went wrong. Please try again."}
          </div>
        )}

        {wallet && (
          <div style={{ marginBottom: "1.25rem", padding: "0.9rem 1rem", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Your Starknet Wallet
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", color: "var(--text)", wordBreak: "break-all", flex: 1 }}>
                {wallet.address.toString()}
              </span>
              <button
                onClick={copyWalletAddress}
                style={{ flexShrink: 0, padding: "0.3rem 0.7rem", fontSize: "0.72rem", fontWeight: 600, background: addressCopied ? "var(--accent-dim)" : "var(--bg-card)", border: "1px solid var(--border-bright)", borderRadius: "6px", color: addressCopied ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", transition: "all 0.15s" }}
              >
                {addressCopied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Fund this address with {invoice!.token} on Starknet Sepolia to pay.
            </p>
          </div>
        )}

        <div className="banner banner-info" style={{ marginBottom: "1.25rem" }}>
          ⛽ <strong>Gasless transfer</strong> — fees sponsored by AVNU. A one-time tiny STRK fee is charged only if your wallet is new.
        </div>

        {/* Action button based on current step */}
        {(step === "view" || step === "error") && (
          <button className="btn btn-primary" onClick={handleConnectClick}>
            {authenticated ? "Connect Wallet & Pay" : "Login to Pay →"}
          </button>
        )}

        {step === "connecting" && (
          <button className="btn btn-primary" disabled>
            <div className="spinner" /> Setting up your wallet...
          </button>
        )}

        {step === "paying" && wallet && (
          <>
            <div className="banner banner-info" style={{ marginBottom: "1rem" }}>
              ✅ Wallet ready! Confirm your payment of <strong>{invoice!.amount} {invoice!.token}</strong>.
            </div>
            <button className="btn btn-primary" onClick={handlePay}>
              Pay {invoice!.amount} {invoice!.token} →
            </button>
          </>
        )}

        {step === "paying" && !wallet && (
          <button className="btn btn-primary" disabled>
            <div className="spinner" /> Processing payment...
          </button>
        )}

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Secured by Starknet · Powered by{" "}
          <a href="https://starkzap.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            Starkzap
          </a>
        </p>
      </div>
    </div>
  );
}
