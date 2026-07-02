"use client";
import { useSession, signIn, signOut } from "next-auth/react";
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
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Fetch orders when panel opens
  useEffect(() => {
    if (panelOpen && session?.user?.email && !ordersLoaded) {
      fetch(`${apiUrl}/api/orders/${encodeURIComponent(session.user.email)}`)
        .then((r) => r.json())
        .then((data) => {
          setOrders(data.orders || []);
          setOrdersLoaded(true);
        })
        .catch(console.error);
    }
  }, [panelOpen, session, ordersLoaded]);

  if (status === "loading") {
    return (
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", animation: "pulse 1.5s ease-in-out infinite" }} />
    );
  }

  if (!session) {
    return (
      <button
        id="google-login-btn"
        onClick={() => signIn("google")}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff", padding: "8px 16px", borderRadius: "10px",
          fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Login with Google
      </button>
    );
  }

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
        {session.user?.image ? (
          <img src={session.user.image} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--brand-yellow)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--brand-purple-dark)" }}>
            {session.user?.name?.[0]?.toUpperCase()}
          </div>
        )}
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
            {session.user?.image ? (
              <img src={session.user.image} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%" }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--brand-yellow)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.2rem", color: "var(--brand-purple-dark)" }}>
                {session.user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>{session.user?.name}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>{session.user?.email}</div>
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

          {/* Sign out */}
          <button
            id="signout-btn"
            onClick={() => { signOut(); setPanelOpen(false); }}
            style={{ width: "100%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "9px", borderRadius: 10, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
