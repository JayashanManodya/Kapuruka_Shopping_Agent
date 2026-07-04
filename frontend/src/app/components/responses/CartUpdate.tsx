"use client";
import React from "react";

interface Props {
  message: React.ReactNode | string;
  action: string;
  product_name: string;
  onViewCart: () => void;
}

export default function CartUpdate({ message, action, product_name, onViewCart }: Props) {
  const actionIcon = action === "removed" ? "🗑️" : action === "cleared" ? "🧹" : "🛒";
  const title = action === "removed" ? "Item Removed" : action === "cleared" ? "Cart Cleared" : "Cart Updated";

  return (
    <div className="animate-fade-in glass-panel" style={{ background: "#ffffff", borderRadius: "16px 16px 16px 4px", padding: 0, maxWidth: "420px", border: "1px solid var(--glass-border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Purple Header Bar */}
      <div style={{ background: "#3b2667", padding: "10px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "1.2rem" }}>{actionIcon}</span>
        <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#facc15" }}>{title}</span>
      </div>
      
      {/* White Body */}
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ color: "#333", fontSize: "0.95rem", lineHeight: 1.5 }}>
          {message}
        </div>

        <button
          onClick={onViewCart}
          style={{
            background: "transparent", color: "var(--brand-purple)",
            border: "1px solid var(--brand-purple)", padding: "6px 16px",
            borderRadius: "20px", fontWeight: 600, fontSize: "0.85rem",
            cursor: "pointer", alignSelf: "flex-start", transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(76,29,149,0.07)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          View Cart →
        </button>
      </div>
    </div>
  );
}
