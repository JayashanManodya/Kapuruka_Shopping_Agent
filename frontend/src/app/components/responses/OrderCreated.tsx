"use client";
import React from "react";

interface Totals { items: number; delivery: number; grand_total: number; }

interface Props {
  message: React.ReactNode | string;
  checkout_url: string;
  order_ref: string;
  expires_at: string;
  totals: Totals;
  onProceed: (url: string) => void;
  showSavePrompt?: boolean;
  onSaveAddress?: () => void;
  onDismissSaveAddress?: () => void;
}

export default function OrderCreated({ message, checkout_url, order_ref, expires_at, totals, onProceed, showSavePrompt, onSaveAddress, onDismissSaveAddress }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="glass-panel agent-card-glow" style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "16px 16px 16px 4px", color: "#333", fontSize: "0.95rem", lineHeight: 1.5, border: "1px solid var(--glass-border)", maxWidth: "88%" }}>
        {message}
      </div>

      <div className="animate-fade-in agent-card-glow" style={{ background: "#3b2667", borderRadius: "16px", padding: "20px", maxWidth: "420px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>Order Confirmed!</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", color: "#e2d9f3", fontSize: "0.95rem" }}>
          <span>Order Ref</span>
          <span style={{ fontFamily: "monospace", letterSpacing: "0.5px", color: "#facc15" }}>{order_ref}</span>
        </div>

        {totals.grand_total > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#e2d9f3", fontSize: "0.9rem" }}>
              <span>Items Total</span>
              <span>LKR {totals.items.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#e2d9f3", fontSize: "0.9rem" }}>
              <span>Delivery</span>
              <span>LKR {totals.delivery.toLocaleString()}</span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.15)", marginBottom: "12px" }}></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>Total</span>
              <span style={{ color: "#4ade80", fontWeight: 800, fontSize: "1.2rem" }}>LKR {totals.grand_total.toLocaleString()}</span>
            </div>
          </>
        )}

        {expires_at && (
          <div style={{ fontSize: "0.75rem", color: "#b4a8d4", marginBottom: "16px", textAlign: "center" }}>
            ⏱ Payment link expires: {expires_at}
          </div>
        )}

        {checkout_url && (
          <button
            onClick={() => onProceed(checkout_url)}
            className="glow-button"
            style={{ width: "100%", background: "#facc15", color: "#1e1b4b", padding: "14px 20px", borderRadius: "10px", fontWeight: 700, fontSize: "1.05rem", border: "none", cursor: "pointer" }}
          >
            Proceed to Checkout
          </button>
        )}
        
        {showSavePrompt && (
          <div className="animate-fade-in" style={{ background: "#4c1d95", borderRadius: "12px", padding: "16px", marginTop: "16px", border: "2px dashed rgba(255,255,255,0.4)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path><line x1="12" y1="7" x2="12" y2="13"></line><line x1="9" y1="10" x2="15" y2="10"></line></svg>
              <span style={{ color: "#fff", fontSize: "0.95rem", lineHeight: 1.4, fontWeight: 500 }}>
                Save this delivery address for next time?
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onSaveAddress} style={{ background: "#facc15", color: "#1e1b4b", border: "none", borderRadius: "20px", padding: "8px 16px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity="0.9"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>Yes, save it</button>
              <button onClick={onDismissSaveAddress} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "20px", padding: "8px 16px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Not now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
