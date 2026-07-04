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
    <div className="animate-fade-in" style={{ background: "#3b2667", borderRadius: "16px", padding: "20px", maxWidth: "420px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <span style={{ fontSize: "1.2rem" }}>{actionIcon}</span>
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>{title}</span>
      </div>
      
      <div style={{ color: "#e2d9f3", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "8px" }}>
        {message}
      </div>

      <button
        onClick={onViewCart}
        style={{
          background: "#facc15", color: "#1e1b4b",
          border: "none", padding: "8px 16px",
          borderRadius: "8px", fontWeight: 700, fontSize: "0.9rem",
          cursor: "pointer", alignSelf: "flex-start", transition: "all 0.2s",
          boxShadow: "0 4px 12px rgba(250, 204, 21, 0.3)"
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
      >
        View Cart
      </button>
    </div>
  );
}
