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
}

export default function OrderCreated({ message, checkout_url, order_ref, expires_at, totals, onProceed }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="glass-panel" style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "16px 16px 16px 4px", color: "#333", fontSize: "0.95rem", lineHeight: 1.5, border: "1px solid var(--glass-border)", maxWidth: "88%" }}>
        {message}
      </div>

      <div className="animate-fade-in" style={{ background: "#3b2667", borderRadius: "16px", padding: "20px", maxWidth: "420px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
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
              <span style={{ color: "#facc15", fontWeight: 800, fontSize: "1.2rem" }}>LKR {totals.grand_total.toLocaleString()}</span>
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
      </div>
    </div>
  );
}
