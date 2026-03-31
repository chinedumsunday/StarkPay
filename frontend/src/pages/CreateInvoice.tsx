import { useState } from "react";
import { Link } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { createInvoice, type Token } from "../lib/invoiceStore";
import { QRCodeSVG } from "qrcode.react";
import { connectWithPrivy } from "../lib/starkzap";

type AddressMode = "app" | "external";

export default function CreateInvoice() {
  const { login, authenticated, getAccessToken, user } = usePrivy();

  const [form, setForm] = useState({
    creatorName: "",
    creatorAddress: "",
    description: "",
    amount: "",
    token: "USDC" as Token,
  });
  const [addressMode, setAddressMode] = useState<AddressMode>("app");
  const [appAddress, setAppAddress] = useState("");
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [invoice, setInvoice] = useState<{ id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const paymentLink = invoice ? `${window.location.origin}/pay/${invoice.id}` : "";
  const resolvedAddress = addressMode === "app" ? appAddress : form.creatorAddress;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function loadAppWallet() {
    if (!authenticated) {
      login();
      return;
    }
    setLoadingWallet(true);
    setError("");
    try {
      const w = await connectWithPrivy(getAccessToken);
      const addr = w.address.toString();
      setAppAddress(addr);
      // Pre-fill the name from social login if blank
      if (!form.creatorName) {
        const displayName =
          user?.google?.name ??
          user?.twitter?.username ??
          user?.email?.address?.split("@")[0] ??
          "";
        setForm((f) => ({ ...f, creatorName: displayName }));
      }
    } catch (err: any) {
      setError("Could not load wallet. Please try again.");
    } finally {
      setLoadingWallet(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = resolvedAddress.trim();

    if (!addr.startsWith("0x") || addr.length < 10) {
      setError("Invalid Starknet address — must start with 0x");
      return;
    }
    if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError("Enter a valid payment amount");
      return;
    }

    setLoadingWallet(true);
    try {
      const id = await createInvoice({
        creatorName: form.creatorName.trim() || "Anonymous",
        creatorAddress: addr,
        description: form.description.trim() || "Invoice",
        amount: form.amount.trim(),
        token: form.token,
      });
      setInvoice({ id });
    } catch {
      setError("Failed to create invoice. Please try again.");
    } finally {
      setLoadingWallet(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareInvoice() {
    const text = `Pay ${form.amount} ${form.token} to ${form.creatorName || "me"} via StarkPay (gasless — no wallet needed):\n${paymentLink}`;

    // Try to share QR code as an image file
    try {
      const svg = document.getElementById("invoice-qr")?.querySelector("svg");
      if (svg && navigator.canShare) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => { ctx.drawImage(img, 0, 0, 200, 200); resolve(); };
          img.onerror = reject;
          img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
        });
        const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
        const file = new File([blob], "starkpay-invoice.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: "StarkPay Invoice", text, files: [file] });
          return;
        }
      }
    } catch {
      // fall through to link-only share
    }

    // Fallback: share link only
    if (navigator.share) {
      await navigator.share({ title: "StarkPay Invoice", text });
    } else {
      // Last resort: copy to clipboard
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="logo">Stark<span>Pay</span></Link>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/wallet" className="btn btn-ghost" style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
            My Wallet
          </Link>
          <Link to="/" className="nav-link" style={{ display: "flex", alignItems: "center" }}>← Home</Link>
        </div>
      </header>

      {!invoice ? (
        <div className="card animate-in">
          <h1>Create Invoice</h1>
          <p className="subtitle">Fill in the details to generate your payment link.</p>

          {error && <div className="banner banner-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Your Name / Business</label>
              <input
                name="creatorName"
                value={form.creatorName}
                onChange={handleChange}
                placeholder="e.g. Chinedum Design Studio"
                required
              />
            </div>

            {/* Wallet address — app or external toggle */}
            <div className="form-group">
              <label>Receive Payment To</label>

              {/* Toggle */}
              <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-input)", borderRadius: "var(--radius)", padding: "0.25rem", marginBottom: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => { setAddressMode("app"); setError(""); }}
                  style={{
                    flex: 1, padding: "0.5rem", border: "none", borderRadius: "8px",
                    fontSize: "0.78rem", fontWeight: 700, fontFamily: "var(--sans)", cursor: "pointer",
                    transition: "all 0.15s",
                    background: addressMode === "app" ? "var(--bg-card)" : "transparent",
                    color: addressMode === "app" ? "var(--accent)" : "var(--text-muted)",
                    boxShadow: addressMode === "app" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                  }}
                >
                  Use App Wallet
                </button>
                <button
                  type="button"
                  onClick={() => { setAddressMode("external"); setError(""); }}
                  style={{
                    flex: 1, padding: "0.5rem", border: "none", borderRadius: "8px",
                    fontSize: "0.78rem", fontWeight: 700, fontFamily: "var(--sans)", cursor: "pointer",
                    transition: "all 0.15s",
                    background: addressMode === "external" ? "var(--bg-card)" : "transparent",
                    color: addressMode === "external" ? "var(--accent)" : "var(--text-muted)",
                    boxShadow: addressMode === "external" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                  }}
                >
                  External Wallet
                </button>
              </div>

              {/* App wallet panel */}
              {addressMode === "app" && (
                <div>
                  {appAddress ? (
                    <div style={{ background: "var(--bg-input)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <div>
                        <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", marginBottom: "0.25rem" }}>
                          Connected
                        </p>
                        <p style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text)", wordBreak: "break-all" }}>
                          {appAddress.slice(0, 14)}...{appAddress.slice(-6)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={loadAppWallet}
                        style={{ flexShrink: 0, padding: "0.3rem 0.7rem", fontSize: "0.7rem", fontWeight: 600, background: "var(--bg-card)", border: "1px solid var(--border-bright)", borderRadius: "6px", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--sans)" }}
                      >
                        Refresh
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={loadAppWallet}
                      disabled={loadingWallet}
                      style={{ justifyContent: "center" }}
                    >
                      {loadingWallet
                        ? <><div className="spinner" style={{ borderTopColor: "var(--accent)", borderColor: "var(--border)" }} /> Loading wallet...</>
                        : authenticated
                          ? "Load My Wallet Address"
                          : "Sign In to Use App Wallet →"
                      }
                    </button>
                  )}
                  {!appAddress && (
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                      Uses your embedded StarkPay wallet — no copy-pasting needed.
                    </p>
                  )}
                </div>
              )}

              {/* External wallet panel */}
              {addressMode === "external" && (
                <div>
                  <input
                    name="creatorAddress"
                    value={form.creatorAddress}
                    onChange={handleChange}
                    placeholder="0x04a8b3c2..."
                    spellCheck={false}
                    required={addressMode === "external"}
                  />
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                    Any Starknet address — Argent, Braavos, or any other wallet.
                  </p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Invoice Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="e.g. Logo design — 3 revisions, final delivery"
                required
              />
            </div>

            <div className="form-group">
              <label>Amount &amp; Currency</label>
              <div className="amount-row">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="100.00"
                  required
                />
                <select name="token" value={form.token} onChange={handleChange}>
                  <option value="USDC">USDC</option>
                  <option value="STRK">STRK</option>
                </select>
              </div>
            </div>

            <div className="banner banner-info" style={{ marginTop: "1.5rem" }}>
              ⛽ Payments are <strong>gasless</strong> — your client pays no transaction fees.
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
              disabled={addressMode === "app" && !appAddress}
            >
              Generate Payment Link →
            </button>

            {addressMode === "app" && !appAddress && (
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.5rem" }}>
                Load your wallet address above first
              </p>
            )}
          </form>
        </div>
      ) : (
        <div className="card animate-in">
          <div className="success-icon">🔗</div>
          <h2 style={{ textAlign: "center", marginBottom: "0.4rem" }}>Invoice Created!</h2>
          <p className="subtitle" style={{ textAlign: "center" }}>
            Share this link. Your client pays with email login — no wallet needed.
          </p>

          <div className="link-box">
            <span className="link-text">{paymentLink}</span>
            <button className="copy-btn" onClick={copyLink}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>

          <div id="invoice-qr" style={{ display: "flex", justifyContent: "center", margin: "1.5rem 0 0.5rem" }}>
            <div style={{ background: "#fff", padding: "12px", borderRadius: "12px" }}>
              <QRCodeSVG value={paymentLink} size={160} />
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Scan to pay
          </p>

          <hr className="divider" />

          <div style={{ marginBottom: "1rem" }}>
            <div className="detail-row">
              <span className="detail-label">From</span>
              <span className="detail-value" style={{ fontFamily: "var(--sans)" }}>{form.creatorName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Description</span>
              <span className="detail-value" style={{ fontFamily: "var(--sans)" }}>{form.description}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Amount</span>
              <span className="detail-value">{form.amount} <span className="token-badge">{form.token}</span></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Paying To</span>
              <span className="detail-value" style={{ fontSize: "0.72rem" }}>
                {resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-6)}
                <span style={{ marginLeft: "0.4rem", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  ({addressMode === "app" ? "App wallet" : "External"})
                </span>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, minWidth: "120px" }}
              onClick={shareInvoice}
            >
              Share Invoice
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, minWidth: "120px" }}
              onClick={() => {
                const text = `💸 I've sent you an invoice for ${form.amount} ${form.token} via StarkPay.\n\nPay here (no wallet needed): ${paymentLink}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
              }}
            >
              Post on X
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: "0 0 auto" }}
              onClick={() => {
                setInvoice(null);
                setAppAddress("");
                setForm({ creatorName: "", creatorAddress: "", description: "", amount: "", token: "USDC" });
              }}
            >
              New Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
