"use client";
import React from "react";

interface Props {
  message: string;
  action: string;
  product_name: string;
  onViewCart: () => void;
}

export default function CartUpdate({ message, action, product_name, onViewCart }: Props) {
  const actionIcon = action === "removed" ? "🗑" : action === "cleared" ? "🧹" : "🛒";

  return (
    <div className="animate-fade-in glass-panel" style={{
      background: "#ffffff", padding: "14px 18px", borderRadius: "16px 16px 16px 4px",
      color: "#333", fontSize: "0.95rem", lineHeight: 1.5,
      border: "1px solid var(--glass-border)", maxWidth: "88%",
      display: "flex", flexDirection: "column", gap: "10px"
    }}>
      <div>{actionIcon} {message}</div>
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
  );
}
