"use client";
import React from "react";

interface TimelineEntry { label: string; time: string | null; done: boolean; }
interface OrderItem { name: string; quantity: number; price: number; }
interface RecipientInfo { name: string; phone: string; }
interface DeliveryInfo { address: string; city: string; date: string; }
interface PaymentInfo { status: string; method: string; }

interface Props {
  message: React.ReactNode | string;
  order_ref: string;
  status: string;
  timeline: TimelineEntry[];
  recipient: RecipientInfo;
  delivery: DeliveryInfo;
  payment: PaymentInfo;
  items: OrderItem[];
}

export default function TrackOrder({ message, order_ref, status, timeline, recipient, delivery, payment, items }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="glass-panel" style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "16px 16px 16px 4px", color: "#333", fontSize: "0.95rem", lineHeight: 1.5, border: "1px solid var(--glass-border)", maxWidth: "88%" }}>
        {message}
      </div>

      <div className="animate-fade-in" style={{ background: "#1e1b4b", borderRadius: "16px", padding: "20px", maxWidth: "460px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#8b8aad", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>ORDER</div>
            <div style={{ color: "#facc15", fontFamily: "monospace", fontWeight: 700, fontSize: "1rem" }}>{order_ref}</div>
          </div>
          <div style={{ background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)", padding: "6px 14px", borderRadius: "20px" }}>
            <span style={{ color: "#facc15", fontWeight: 700, fontSize: "0.85rem" }}>{status}</span>
          </div>
        </div>

        {/* Timeline */}
        {timeline && timeline.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "0.7rem", color: "#8b8aad", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "12px" }}>TIMELINE</div>
            {timeline.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", marginBottom: i < timeline.length - 1 ? "0" : "0" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0,
                    background: entry.done ? "#facc15" : "rgba(255,255,255,0.15)",
                    border: entry.done ? "2px solid #facc15" : "2px solid rgba(255,255,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    {entry.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#1e1b4b" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>
                  {i < timeline.length - 1 && (
                    <div style={{ width: "2px", height: "24px", background: entry.done ? "rgba(250,204,21,0.4)" : "rgba(255,255,255,0.1)", margin: "2px 0" }}></div>
                  )}
                </div>
                <div style={{ paddingBottom: i < timeline.length - 1 ? "16px" : "0" }}>
                  <div style={{ color: entry.done ? "#fff" : "#8b8aad", fontSize: "0.9rem", fontWeight: entry.done ? 600 : 400 }}>{entry.label}</div>
                  {entry.time && <div style={{ color: "#8b8aad", fontSize: "0.75rem" }}>{entry.time}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", marginBottom: "16px" }}></div>

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          {recipient?.name && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "#8b8aad", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "4px" }}>RECIPIENT</div>
              <div style={{ color: "#e2d9f3", fontSize: "0.85rem" }}>{recipient.name}</div>
              {recipient.phone && <div style={{ color: "#8b8aad", fontSize: "0.75rem" }}>{recipient.phone}</div>}
            </div>
          )}
          {delivery?.city && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "#8b8aad", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "4px" }}>DELIVERY</div>
              <div style={{ color: "#e2d9f3", fontSize: "0.85rem" }}>{delivery.city}</div>
              {delivery.date && <div style={{ color: "#8b8aad", fontSize: "0.75rem" }}>{delivery.date}</div>}
            </div>
          )}
          {payment?.status && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "#8b8aad", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "4px" }}>PAYMENT</div>
              <div style={{ color: payment.status === "paid" ? "#4ade80" : "#facc15", fontSize: "0.85rem", textTransform: "capitalize" }}>{payment.status}</div>
              {payment.method && <div style={{ color: "#8b8aad", fontSize: "0.75rem" }}>{payment.method}</div>}
            </div>
          )}
        </div>

        {/* Items */}
        {items && items.length > 0 && (
          <div>
            <div style={{ fontSize: "0.65rem", color: "#8b8aad", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "8px" }}>ITEMS</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "#e2d9f3", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span>{item.name} x{item.quantity}</span>
                {item.price > 0 && <span style={{ color: "#facc15" }}>LKR {item.price.toLocaleString()}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
