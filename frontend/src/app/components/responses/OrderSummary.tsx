"use client";
import React from "react";

interface OrderItem { name: string; quantity: number; price: number; }
interface RecipientInfo { name: string; phone: string; }
interface DeliveryInfo { address: string; city: string; date: string; }

interface Props {
  message: React.ReactNode | string;
  recipient: RecipientInfo;
  delivery: DeliveryInfo;
  sender: string;
  items: OrderItem[];
  delivery_fee: number;
  grand_total: number;
  onConfirm: () => void;
}

export default function OrderSummary({ message, recipient, delivery, sender, items, delivery_fee, grand_total, onConfirm }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="glass-panel agent-card-glow" style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "16px 16px 16px 4px", color: "#333", fontSize: "0.95rem", lineHeight: 1.5, border: "1px solid var(--glass-border)", maxWidth: "88%" }}>
        {message}
      </div>

      <div className="animate-fade-in agent-card-glow" style={{ background: "#3b2667", borderRadius: "16px", maxWidth: "420px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "20px", borderBottom: "3px solid #facc15" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>Order Summary</span>
        </div>
        
        <div style={{ padding: "20px", paddingTop: "16px" }}>

        {/* Recipient */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "0.7rem", color: "#b4a8d4", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "8px" }}>RECIPIENT</div>
          <div style={{ color: "#e2d9f3", fontSize: "0.9rem" }}>{recipient.name} — {recipient.phone}</div>
        </div>

        {/* Delivery */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "0.7rem", color: "#b4a8d4", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "8px" }}>DELIVERY</div>
          <div style={{ color: "#e2d9f3", fontSize: "0.9rem" }}>{delivery.address}, {delivery.city}</div>
          <div style={{ color: "#b4a8d4", fontSize: "0.85rem" }}>{delivery.date}</div>
        </div>

        {/* Sender */}
        {sender && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "0.7rem", color: "#b4a8d4", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "8px" }}>SENDER</div>
            <div style={{ color: "#e2d9f3", fontSize: "0.9rem" }}>{sender}</div>
          </div>
        )}

        {/* Items */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "0.7rem", color: "#b4a8d4", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "8px" }}>ITEMS</div>
          {items.map((item, i) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "#e2d9f3", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", flexDirection: "column", paddingRight: "12px" }}>
                  <span>{item.name} x{item.quantity}</span>
                </div>
                <span style={{ color: "#facc15", fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}>LKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
              {i < items.length - 1 && (
                <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "6px 0" }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.15)", marginBottom: "16px" }}></div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#e2d9f3", fontSize: "0.9rem", marginBottom: "8px" }}>
          <span>Delivery Fee</span>
          <span>LKR {delivery_fee.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>Grand Total</span>
          <span style={{ color: "#4ade80", fontWeight: 800, fontSize: "1.2rem" }}>LKR {grand_total.toLocaleString()}</span>
        </div>

        <button
          onClick={onConfirm}
          className="glow-button"
          style={{ width: "100%", background: "#facc15", color: "#1e1b4b", padding: "14px 20px", borderRadius: "10px", fontWeight: 700, fontSize: "1.05rem", border: "none", cursor: "pointer" }}
        >
          ✓ Confirm & Place Order
        </button>
        </div>
      </div>
    </div>
  );
}
