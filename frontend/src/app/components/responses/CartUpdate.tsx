"use client";
import React from "react";

import { ShoppingCart, Trash2, Eraser } from "lucide-react";

interface Props {
  message: React.ReactNode | string;
  action: string;
  product_name: string;
  onViewCart: () => void;
}

export default function CartUpdate({ message, action, product_name, onViewCart }: Props) {
  const actionIcon = action === "removed" ? <Trash2 size={18} color="#fff" /> : action === "cleared" ? <Eraser size={18} color="#fff" /> : <ShoppingCart size={18} color="#fff" />;
  const title = action === "removed" ? "Item Removed" : action === "cleared" ? "Cart Cleared" : "Cart Updated";

  return (
    <div className="animate-fade-in glass-panel agent-card-glow" style={{ background: "#ffffff", borderRadius: "16px 16px 16px 4px", padding: 0, maxWidth: "420px", border: "1px solid var(--glass-border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Purple Header Bar */}
      <div style={{ background: "#3b2667", padding: "10px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
        {actionIcon}
        <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#fff" }}>{title}</span>
      </div>
      
      {/* White Body */}
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ color: "#333", fontSize: "0.95rem", lineHeight: 1.5 }}>
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
    </div>
  );
}
