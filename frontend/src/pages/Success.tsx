import { useLocation, Link } from "react-router-dom";

interface SuccessState {
  txHash: string;
  explorerUrl: string;
  amount: string;
  token: string;
  description: string;
  creatorName: string;
}

export default function Success() {
  const location = useLocation();
  const state = location.state as SuccessState | null;

  if (!state) {
    return (
      <div className="page">
        <header className="page-header"><Link to="/" className="logo">Stark<span>Pay</span></Link></header>
        <div className="card animate-in" style={{ textAlign: "center" }}>
          <h2>Payment Confirmed</h2>
          <p className="subtitle">Your payment was processed on Starknet.</p>
          <Link to="/" className="btn btn-ghost">← Go Home</Link>
        </div>
      </div>
    );
  }

  const shortHash = `${state.txHash.slice(0, 12)}...${state.txHash.slice(-6)}`;

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="logo">Stark<span>Pay</span></Link>
      </header>

      <div className="card animate-in" style={{ textAlign: "center" }}>
        <div className="success-icon">✅</div>

        <h1 style={{ marginBottom: "0.4rem" }}>Payment Sent!</h1>
        <p className="subtitle">
          Your payment of <strong style={{ color: "var(--accent)" }}>{state.amount} {state.token}</strong> to{" "}
          <strong>{state.creatorName}</strong> was confirmed on Starknet.
        </p>

        <hr className="divider" />

        <div style={{ textAlign: "left", marginBottom: "1.75rem" }}>
          <div className="detail-row">
            <span className="detail-label">Amount</span>
            <span className="detail-value">
              {state.amount} <span className="token-badge">{state.token}</span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">To</span>
            <span className="detail-value" style={{ fontFamily: "var(--sans)" }}>{state.creatorName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">For</span>
            <span className="detail-value" style={{ fontFamily: "var(--sans)" }}>{state.description}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Tx Hash</span>
            <span className="detail-value">{shortHash}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Gas Paid</span>
            <span className="detail-value" style={{ color: "var(--accent)" }}>$0.00 — Sponsored ⚡</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexDirection: "column" }}>
          <a
            href={state.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            View on Voyager Explorer ↗
          </a>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const text = `Just paid ${state.amount} ${state.token} onchain via @StarkPay — powered by @Starknet. No seed phrase. No gas fees. The future of payments is here. 🚀\n\nTx: ${state.explorerUrl}`;
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
            }}
          >
            Share on Twitter
          </button>
          <Link to="/" className="nav-link" style={{ textAlign: "center", marginTop: "0.5rem" }}>
            ← Back to Home
          </Link>
        </div>
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.7rem", color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
        Powered by Starkzap SDK · Built on Starknet
      </p>
    </div>
  );
}
