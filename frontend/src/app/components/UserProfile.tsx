"use client";
import { useState, useEffect } from "react";

interface Order {
  id: number;
  order_number: string;
  product_name: string | null;
  created_at: string | null;
}

interface UserProfileProps {
  onTrackOrder?: (orderNumber: string) => void;
}

export default function UserProfile({ onTrackOrder }: UserProfileProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  // Fetch orders when panel opens
  useEffect(() => {
    if (panelOpen && !ordersLoaded) {
      try {
        const saved = localStorage.getItem("kapruka_orders");
        if (saved) {
          setOrders(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
      setOrdersLoaded(true);
    }
  }, [panelOpen, ordersLoaded]);

  return (
    <div style={{ position: "relative" }}>
      <button
        id="user-profile-btn"
        onClick={() => setPanelOpen(!panelOpen)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", padding: "4px", borderRadius: "50%",
          cursor: "pointer", transition: "all 0.2s ease", width: "42px", height: "42px"
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      {panelOpen && (
        <div
          style={{
            position: "absolute", right: 0, top: "calc(100% + 10px)", width: 320, zIndex: 999,
            background: "rgba(21, 9, 42, 0.97)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", padding: "20px",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--brand-yellow)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.2rem", color: "var(--brand-purple-dark)" }}>
              G
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>Guest User</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>Local session</div>
            </div>
          </div>

          {/* Orders section */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>
                My Orders
              </span>
              <button
                onClick={() => { setOrdersLoaded(false); }}
                style={{ background: "none", border: "none", color: "var(--brand-yellow)", fontSize: "0.75rem", cursor: "pointer" }}
              >
                Refresh
              </button>
            </div>
            {!ordersLoaded ? (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>Loading orders...</div>
            ) : orders.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>No orders yet 🛒</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.85rem" }}>#{order.order_number}</div>
                      {order.product_name && (
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginTop: 2 }}>{order.product_name}</div>
                      )}
                    </div>
                    <button
                      id={`track-order-${order.order_number}`}
                      onClick={() => {
                        setPanelOpen(false);
                        onTrackOrder?.(`Track my order number ${order.order_number}`);
                      }}
                      style={{ background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", border: "none", padding: "5px 12px", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      Track
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
