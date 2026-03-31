import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page">
      <header className="page-header" style={{ maxWidth: 640 }}>
        <a href="/" className="logo">Stark<span>Pay</span></a>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/wallet" className="btn btn-ghost" style={{ width: "auto", padding: "0.6rem 1.2rem", fontSize: "0.85rem" }}>
            My Wallet
          </Link>
          <Link to="/create" className="btn btn-primary" style={{ width: "auto", padding: "0.6rem 1.2rem", fontSize: "0.85rem" }}>
            Create Invoice →
          </Link>
        </div>
      </header>

      <div className="hero animate-in">
        <div className="tag">⚡ Built on Starknet · Powered by Starkzap SDK</div>
        <h1>Get paid onchain.<br />No wallet setup required.</h1>
        <p className="subtitle" style={{ fontSize: "1rem", maxWidth: 420, margin: "0 auto 0" }}>
          Create a payment link in 30 seconds. Your client pays with email login —
          no seed phrases, no gas fees, no friction.
        </p>

        <div className="cta-row">
          <Link to="/create" className="btn btn-primary" style={{ minWidth: 200 }}>
            Create a Payment Link
          </Link>
          <a
            href="https://github.com/YOUR_USERNAME/starkpay"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            View on GitHub
          </a>
        </div>
      </div>

      <div className="feature-grid animate-in-delay">
        <div className="feature-card">
          <div className="icon">🔐</div>
          <h3>No Seed Phrases</h3>
          <p>Payers log in with email or Google. Wallet created automatically.</p>
        </div>
        <div className="feature-card">
          <div className="icon">⛽</div>
          <h3>Gasless Payments</h3>
          <p>AVNU Paymaster sponsors gas — payers never touch ETH or STRK for fees.</p>
        </div>
        <div className="feature-card">
          <div className="icon">💵</div>
          <h3>USDC & STRK</h3>
          <p>Accept stablecoins or STRK directly to your Starknet address.</p>
        </div>
        <div className="feature-card">
          <div className="icon">🔗</div>
          <h3>Shareable Links</h3>
          <p>One link. Send via WhatsApp, email, or Twitter. Anyone can pay.</p>
        </div>
      </div>

      <div style={{ marginTop: "3rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
          Built for the Starkzap Developer Bounty · Powered by Starkzap SDK + Privy
        </p>
      </div>
    </div>
  );
}
