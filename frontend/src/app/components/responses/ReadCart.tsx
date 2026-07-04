"use client";
import React from "react";

import { ShoppingCart } from "lucide-react";

interface OrderItem {
  product_name?: string;
  name?: string;
  quantity: number;
  price: number;
}

interface Props {
  message: React.ReactNode | string;
  items: OrderItem[];
  total: number;
  onViewCart: () => void;
}

export default function ReadCart({ message, items, total, onViewCart }: Props) {
  // Fallback calculation in case the AI didn't sum it up
  const calculatedTotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  const displayTotal = total > 0 ? total : calculatedTotal;

  return (
    <div className="animate-fade-in glass-panel" style={{ background: "#ffffff", borderRadius: "16px 16px 16px 4px", padding: 0, maxWidth: "420px", border: "1px solid var(--glass-border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Purple Header Bar */}
      <div style={{ background: "#3b2667", padding: "10px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
        <ShoppingCart size={18} color="#fff" />
        <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#fff" }}>Your Cart</span>
      </div>

      {/* White Body */}
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {message && (
          <div style={{ color: "#333", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "8px" }}>
            {message}
          </div>
        )}

        {/* Items List */}
        {items && items.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "#444", fontSize: "0.9rem" }}>
                <span>{item.name || item.product_name} x{item.quantity}</span>
                <span style={{ fontWeight: 600 }}>LKR {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ height: "1px", background: "#eee", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", color: "#333", fontSize: "1rem", fontWeight: 700 }}>
              <span>Total</span>
              <span>LKR {displayTotal.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div style={{ color: "#888", fontSize: "0.9rem", fontStyle: "italic", textAlign: "center", margin: "10px 0" }}>
            Your cart is currently empty.
          </div>
        )}

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
