import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePrivy, useFundWallet } from "@privy-io/react-auth";
import { connectWithPrivy, getBalance } from "../lib/starkzap";
import type { WalletInterface } from "starkzap";

type Tab = "overview" | "fund" | "export";

export default function Wallet() {
  const { login, logout, authenticated, user, getAccessToken, exportWallet } = usePrivy();
  const { fundWallet } = useFundWallet();

  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [strkBalance, setStrkBalance] = useState<string>("");
  const [usdcBalance, setUsdcBalance] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authenticated) loadWallet();
  }, [authenticated]);

  async function loadWallet() {
    setLoading(true);
    setError("");
    try {
      const w = await connectWithPrivy(getAccessToken);
      setWallet(w);
      const [strk, usdc] = await Promise.all([
        getBalance(w, "STRK"),
        getBalance(w, "USDC"),
      ]);
      setStrkBalance(strk);
      setUsdcBalance(usdc);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }

  async function copyAddress() {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExport() {
    try {
      // Privy shows a secure modal — the private key never touches our code
      await exportWallet();
    } catch (err: any) {
      setError(err?.message ?? "Export failed");
    }
  }

  async function handleFundWallet() {
    if (!wallet) return;
    try {
      await fundWallet(wallet.address.toString(), {
        chain: { id: 11155111 }, // Starknet Sepolia (pass mainnet ID for production)
      });
    } catch {
      // User closed the modal — not an error
    }
  }

  const addr = wallet?.address?.toString() ?? "";
  const shortAddr = addr ? `${addr.slice(0, 10)}...${addr.slice(-6)}` : "";
  const AVNU_SWAP_URL = `https://app.avnu.fi/en?tokenFrom=STRK&network=sepolia`;

  if (!authenticated) {
    return (
      <div className="page">
        <header className="page-header">
          <Link to="/" className="logo">Stark<span>Pay</span></Link>
        </header>
        <div className="card animate-in" style={{ textAlign: "center" }}>
          <div className="success-icon" style={{ background: "rgba(0,232,135,0.08)", borderColor: "var(--accent)", fontSize: "1.6rem" }}>
            🔐
          </div>
          <h2>Your Wallet</h2>
          <p className="subtitle">Sign in to access your embedded Starknet wallet.</p>
          <button className="btn btn-primary" onClick={login}>Sign In →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="logo">Stark<span>Pay</span></Link>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Link to="/create" className="btn btn-ghost" style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
            + Invoice
          </Link>
          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.8rem" }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="card animate-in" style={{ maxWidth: 560 }}>
        {/* Wallet header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            Your Starknet Wallet
          </p>
          {loading ? (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div className="spinner" style={{ borderTopColor: "var(--accent)", borderColor: "var(--border)" }} />
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Loading wallet...</span>
            </div>
          ) : wallet ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", color: "var(--text)", wordBreak: "break-all" }}>
                {shortAddr}
              </span>
              <button
                onClick={copyAddress}
                style={{ flexShrink: 0, padding: "0.25rem 0.6rem", fontSize: "0.7rem", fontWeight: 600, background: copied ? "var(--accent-dim)" : "var(--bg-input)", border: "1px solid var(--border-bright)", borderRadius: "6px", color: copied ? "var(--accent)" : "var(--text-muted)", cursor: "pointer" }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>—</span>
          )}
        </div>

        {/* Balance cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.75rem" }}>
          {(["STRK", "USDC"] as const).map((token) => (
            <div key={token} style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem" }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                {token}
              </p>
              <p style={{ fontFamily: "var(--mono)", fontSize: "1.3rem", fontWeight: 400, color: loading ? "var(--text-muted)" : "var(--text)" }}>
                {loading ? "—" : token === "STRK" ? (strkBalance || "0") : (usdcBalance || "0")}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="banner banner-error" style={{ marginBottom: "1.25rem" }}>{error}</div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-input)", borderRadius: "var(--radius)", padding: "0.25rem", marginBottom: "1.5rem" }}>
          {(["overview", "fund", "export"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "0.55rem", border: "none", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 700,
                fontFamily: "var(--sans)", cursor: "pointer", transition: "all 0.15s",
                background: tab === t ? "var(--bg-card)" : "transparent",
                color: tab === t ? "var(--accent)" : "var(--text-muted)",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {t === "overview" ? "Overview" : t === "fund" ? "Fund" : "Export Key"}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <a
              href={AVNU_SWAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Swap Tokens on AVNU ↗
            </a>
            <Link to="/create" className="btn btn-ghost">
              Create Payment Invoice
            </Link>
            {wallet && (
              <a
                href={`https://sepolia.voyager.online/contract/${addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                View on Voyager Explorer ↗
              </a>
            )}
          </div>
        )}

        {/* Fund tab */}
        {tab === "fund" && (
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Fund your wallet by sending STRK or USDC to your address on <strong style={{ color: "var(--text)" }}>Starknet Sepolia</strong>.
            </p>

            {/* Address display */}
            <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-bright)", borderRadius: "var(--radius)", padding: "1rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Your deposit address
              </p>
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--accent)", wordBreak: "break-all", lineHeight: 1.5 }}>
                {addr || "—"}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button className="btn btn-primary" onClick={copyAddress}>
                {copied ? "✓ Address Copied!" : "Copy Deposit Address"}
              </button>
              <button className="btn btn-ghost" onClick={handleFundWallet} disabled={!wallet}>
                Buy Crypto via On-Ramp ↗
              </button>
            </div>

            <div className="banner banner-info" style={{ marginTop: "1rem" }}>
              Only send assets on <strong>Starknet</strong>. Sending from other chains will result in lost funds.
            </div>
          </div>
        )}

        {/* Export tab */}
        {tab === "export" && (
          <div>
            <div className="banner banner-error" style={{ marginBottom: "1.25rem" }}>
              <strong>Warning:</strong> Your private key gives full control of your wallet. Never share it with anyone. Store it securely offline.
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Export your private key to use this wallet in other apps like Argent or Braavos. Privy will show it in a secure modal — it never touches our servers.
            </p>
            <button className="btn btn-ghost" onClick={handleExport} style={{ borderColor: "var(--error)", color: "var(--error)" }}>
              Export Private Key
            </button>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1rem", textAlign: "center" }}>
              Secured by Privy TEE · Your key never leaves the enclave until you export it
            </p>
          </div>
        )}
      </div>

      {/* User info footer */}
      {user && (
        <p style={{ marginTop: "1.5rem", fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
          {user.email?.address ?? user.google?.email ?? user.twitter?.username ?? ""}
        </p>
      )}
    </div>
  );
}
