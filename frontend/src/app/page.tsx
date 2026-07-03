"use client";

import React, { useState, useEffect, useRef } from "react";
import { RotateCcw, ShoppingCart, Settings, Mic, Paperclip } from "lucide-react";
import UserProfile from "./components/UserProfile";
import RecommendedItems from "./components/responses/RecommendedItems";
import ProductDetail from "./components/responses/ProductDetail";
import OrderSummary from "./components/responses/OrderSummary";
import OrderCreated from "./components/responses/OrderCreated";
import TrackOrder from "./components/responses/TrackOrder";
import ListCategories from "./components/responses/ListCategories";
import CartUpdate from "./components/responses/CartUpdate";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface Message {
  role: "user" | "assistant" | "tool" | "system" | "unknown";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
  hidden?: boolean;
  structured_response?: AgentResponse | null;
}

// Structured response types — mirrors backend response_formats.py
type AgentResponse =
  | { type: "recommended_items"; message: string; items: any[] }
  | { type: "product_detail"; message: string; product: any }
  | { type: "list_categories"; message: string; categories: any[] }
  | { type: "cart_update"; message: string; action: string; product_id: string; product_name: string }
  | { type: "order_summary"; message: string; recipient: any; delivery: any; sender: string; items: any[]; delivery_fee: number; grand_total: number }
  | { type: "order_created"; message: string; checkout_url: string; order_ref: string; expires_at: string; totals: any }
  | { type: "track_order"; message: string; order_ref: string; status: string; timeline: any[]; recipient: any; delivery: any; payment: any; items: any[] }
  | { type: "text"; message: string };

interface ChatThread {
  thread_id: string;
  title: string;
  updated_at: string;
}

// ─────────────────────────────────────────
// Logo Component
// ─────────────────────────────────────────

function KaprukaLogo() {
  return (
    <div className="flex items-center gap-1 font-extrabold text-white tracking-tight select-none" style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "1.4rem", display: "inline-flex", alignItems: "center" }}>
      <span>kap</span>
      <span style={{ position: "relative", display: "inline-block" }}>
        ru
        <svg style={{ position: "absolute", bottom: "-7px", left: "0", width: "100%" }} height="6" viewBox="0 0 24 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2C6 7 18 7 22 2" stroke="#ffd200" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <span>ka</span>
    </div>
  );
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

/** Safely parse a JSON string into an AgentResponse. Falls back to text type. */
const parseStructuredResponse = (raw: string | null | undefined): AgentResponse | null => {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj.type === "string" && typeof obj.message === "string") {
      return obj as AgentResponse;
    }
  } catch (_) {}
  return null;
};

/** Render bold (**text**) and markdown links [text](url) in plain text messages */
const renderFormattedText = (text: string) => {
  if (!text) return null;
  const linkParts = text.split(/\[([^\]]+)\]\(([^)]+)\)/g);
  return linkParts.map((part, index, arr) => {
    if (index % 3 === 0) {
      const boldParts = part.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={index}>
          {boldParts.map((bPart, bIndex) =>
            bIndex % 2 === 1
              ? <strong key={bIndex} style={{ fontWeight: 800, color: "inherit" }}>{bPart}</strong>
              : <span key={bIndex}>{bPart}</span>
          )}
        </span>
      );
    }
    if (index % 3 === 1) {
      const url = arr[index + 1];
      return (
        <a
          key={index}
          href={url}
          onClick={e => {
            if (url === "#" || url.includes("basket") || url.includes("cart")) {
              e.preventDefault();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-cart"));
              }
            }
          }}
          style={{ color: "var(--brand-purple)", fontWeight: "bold", textDecoration: "underline", cursor: "pointer" }}
        >
          {part}
        </a>
      );
    }
    return null;
  });
};

// ─────────────────────────────────────────
// SearchableSelect
// ─────────────────────────────────────────

const SearchableSelect = ({ value, onChange, options, placeholder }: { value: string; onChange: (val: string) => void; options: string[]; placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(value);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={isOpen ? search : (value || search)}
        onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        style={{ width: "100%", background: "rgba(34, 19, 69, 0.6)", border: "1px solid var(--glass-border)", borderRadius: "10px", padding: "12px", color: "#fff", outline: "none", boxSizing: "border-box" }}
      />
      {isOpen && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "rgba(20, 10, 45, 0.95)", border: "1px solid var(--glass-border)", borderRadius: "10px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", zIndex: 1000, backdropFilter: "blur(10px)" }}>
          {filtered.length === 0
            ? <div style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.9rem" }}>No city found...</div>
            : filtered.map(opt => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setSearch(opt); setIsOpen(false); }}
                style={{ padding: "10px 12px", color: "#fff", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)", background: opt === value ? "rgba(255,255,255,0.1)" : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = opt === value ? "rgba(255,255,255,0.1)" : "transparent"}
              >
                {opt}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Main App
// ─────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [threadId, setThreadId] = useState("session_default");
  const [isLoading, setIsLoading] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: "", address: "", city: "", date: "", phone: "", giftMessage: "" });
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showPostPaymentDialog, setShowPostPaymentDialog] = useState(false);
  const [currentOrderRef, setCurrentOrderRef] = useState<string | null>(null);
  const [loadingMoreIds, setLoadingMoreIds] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const initialTextRef = useRef("");

  // Auto-scroll on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("kapruka_cart");
    if (savedCart) { try { setCartItems(JSON.parse(savedCart)); } catch (e) {} }
    const savedMessages = localStorage.getItem("kapruka_messages_v3");
    if (savedMessages) { try { setMessages(JSON.parse(savedMessages)); } catch (e) {} }
  }, []);

  useEffect(() => { localStorage.setItem("kapruka_cart", JSON.stringify(cartItems)); }, [cartItems]);
  useEffect(() => { localStorage.setItem("kapruka_messages_v3", JSON.stringify(messages)); }, [messages]);

  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener("open-cart", handleOpenCart);
    return () => window.removeEventListener("open-cart", handleOpenCart);
  }, []);

  useEffect(() => {
    if (!welcomed) {
      setThreadId("chat_local");
      setWelcomed(true);
    }
  }, []);

  const toggleListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice chat is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    setInputText(currentInputText => {
      initialTextRef.current = currentInputText ? currentInputText + " " : "";
      return currentInputText;
    });

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let finalAndInterim = "";
      for (let i = 0; i < event.results.length; ++i) finalAndInterim += event.results[i][0].transcript;
      setInputText(initialTextRef.current + finalAndInterim);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => recognition.stop(), 2500);
    };
    recognition.onerror = (event: any) => {
      if (event.error === "aborted") { setIsListening(false); return; }
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      setTimeout(() => {
        const sendBtn = document.getElementById("send-msg-btn") as HTMLButtonElement;
        if (sendBtn && !sendBtn.disabled) sendBtn.click();
      }, 100);
    };
    recognition.start();
  };

  const addToCart = (item: any) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === item.id);
      if (existing) {
        return prev.map(i => i.product_id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i);
      } else {
        return [...prev, { product_id: item.id, product_name: item.name, price: item.price || 0, quantity: 1, image_url: item.image_url }];
      }
    });

    const structured: AgentResponse = {
      type: "cart_update",
      message: `Added ${item.name} to your basket! 🛒`,
      action: "added",
      product_id: item.id,
      product_name: item.name
    };
    
    const syntheticMsg: Message = { 
      role: "assistant", 
      content: JSON.stringify(structured), 
      structured_response: structured 
    };
    setMessages(prev => [...prev, syntheticMsg]);
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCartItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity } : i));
  };

  const handleCartCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false);
    handleSendMessage("I want to checkout. Ask me for recipient, delivery, and sender details before creating the order.");
  };

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const submitCheckoutForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckoutLoading(true);
    const checkoutPayload = {
      name: checkoutForm.name,
      phone: checkoutForm.phone,
      gift_message: checkoutForm.giftMessage || undefined,
      delivery: { address: checkoutForm.address, city: checkoutForm.city, date: checkoutForm.date },
      cart: cartItems,
      thread_id: threadId
    };
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL as string;
    try {
      const res = await fetch(`${apiBaseUrl}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Failed to process checkout. Please try again.");
      } else {
        setShowCheckoutModal(false);
        const structured: AgentResponse = {
          type: "order_created",
          message: "Your order has been created successfully! 🎉",
          checkout_url: data.checkout_url,
          order_ref: data.order_ref,
          expires_at: "",
          totals: { items: 0, delivery: 0, grand_total: 0 }
        };
        const syntheticMsg: Message = {
          role: "assistant",
          content: JSON.stringify(structured),
          structured_response: structured
        };
        setMessages(prev => [...prev, syntheticMsg]);
        setCurrentOrderRef(data.order_ref);
        setCheckoutForm({ name: "", address: "", city: "", date: "", phone: "", giftMessage: "" });
        try {
          const savedOrders = JSON.parse(localStorage.getItem("kapruka_orders") || "[]");
          savedOrders.unshift({ id: Date.now(), order_number: data.order_ref, product_name: cartItems.map(c => c.product_name || c.name).join(", "), created_at: new Date().toISOString() });
          localStorage.setItem("kapruka_orders", JSON.stringify(savedOrders));
        } catch (e) {}
      }
    } catch (e) {
      alert("Network error. Please try again.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPostPaymentDialog(false);
    setCartItems([]);
    const structured: AgentResponse = {
      type: "text",
      message: `Thank you for confirming! I have cleared your cart for you. You can track your order status anytime by pasting the **Order Number** sent to your email into this chat.`
    };
    const syntheticMsg: Message = { role: "assistant", content: JSON.stringify(structured), structured_response: structured };
    setMessages(prev => [...prev, syntheticMsg]);
  };

  const handlePaymentPending = () => {
    setShowPostPaymentDialog(false);
    alert("No worries! You can click 'Proceed to Checkout' on the Order Confirmation Card whenever you are ready to complete your payment.");
  };

  const resetChat = () => {
    setMessages([]);
    localStorage.removeItem("kapruka_messages_v3");
  };

  const handleSendMessage = async (text: string, options?: { hidden?: boolean }) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text, hidden: options?.hidden };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL as string;
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
            tool_calls: m.tool_calls,
            tool_call_id: m.tool_call_id,
            name: m.name
          })),
          user_email: null,
          cart: cartItems
        })
      });

      if (!response.ok) throw new Error("Server responded with error status: " + response.status);

      const data = await response.json();
      const structured: AgentResponse | null = data.structured_response || null;

      if (data.history && data.history.length > 0) {
        // Attach the structured_response to the last assistant message
        const history: Message[] = data.history.map((m: any, idx: number, arr: any[]) => {
          if (m.role === "assistant" && idx === arr.length - 1 && structured) {
            return { ...m, structured_response: structured };
          }
          return m;
        });
        setMessages(history);
      }

      if (data.cart) setCartItems(data.cart);

      // Handle special responses
      if (structured?.type === "cart_update" && structured.action === "added") {
        // Cart was updated via agent — sync it
      }
      if (structured?.type === "order_created" && (structured as any).checkout_url) {
        setCurrentOrderRef((structured as any).order_ref || null);
      }

    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: JSON.stringify({ type: "text", message: `Aiyo! ⚠️ I had trouble connecting to the backend server. Please try again later. (${error.message})` }),
          structured_response: { type: "text", message: `Aiyo! ⚠️ I had trouble connecting to the backend server. Please try again later. (${error.message})` }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async (msgIndex: number) => {
    setLoadingMoreIds(prev => ({ ...prev, [msgIndex]: true }));
    try {
      const historyUpToMessage = messages.slice(0, msgIndex + 1).map(m => ({
        role: m.role, content: m.content, tool_calls: m.tool_calls, name: m.name, tool_call_id: m.tool_call_id
      }));
      historyUpToMessage.push({ role: "user", content: "Please provide up to 10 MORE different products for my previous request. DO NOT repeat any of the products you just listed.", tool_calls: undefined, name: undefined, tool_call_id: undefined });

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyUpToMessage, user_email: null })
      });

      if (!response.ok) throw new Error("Server error: " + response.status);
      const data = await response.json();
      const newStructured: AgentResponse | null = data.structured_response || null;

      if (data.history && data.history.length > historyUpToMessage.length) {
        const newlyAdded = data.history.slice(historyUpToMessage.length);
        setMessages(prev => {
          const newMsgs = [...prev];
          newlyAdded.forEach((msg: any) => {
            newMsgs.push({ ...msg, hidden: true });
          });

          // If new response has recommended_items, merge them into the existing message's structured_response
          if (newStructured?.type === "recommended_items") {
            const existing = newMsgs[msgIndex];
            const existingSR = existing.structured_response;
            if (existingSR?.type === "recommended_items") {
              const existingIds = new Set(existingSR.items.map((i: any) => i.id));
              const newItems = newStructured.items.filter((i: any) => !existingIds.has(i.id));
              newMsgs[msgIndex] = {
                ...existing,
                structured_response: { ...existingSR, items: [...existingSR.items, ...newItems] }
              };
            }
          }
          return newMsgs;
        });
      }
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setLoadingMoreIds(prev => ({ ...prev, [msgIndex]: false }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage(inputText);
  };

  // ─────────────────────────────────────────
  // Structured Response Renderer
  // ─────────────────────────────────────────

  const renderStructuredResponse = (sr: AgentResponse, msgIndex: number) => {
    switch (sr.type) {
      case "recommended_items":
        return (
          <RecommendedItems
            message={sr.message}
            items={sr.items}
            carouselId={`carousel-${msgIndex}`}
            onAddToCart={(item) => addToCart({ id: item.id, name: item.name, price: item.price, image_url: item.image_url })}
            onViewDetails={(item) => handleSendMessage(`Please retrieve details for product ${item.id}`)}
            onLoadMore={() => handleLoadMore(msgIndex)}
            isLoadingMore={loadingMoreIds[msgIndex]}
          />
        );

      case "product_detail":
        return (
          <ProductDetail
            message={sr.message}
            product={sr.product}
            onAddToCart={(p) => addToCart({ id: p.id, name: p.name, price: p.price, image_url: p.images?.[0] })}
          />
        );

      case "list_categories":
        return (
          <ListCategories
            message={sr.message}
            categories={sr.categories}
            onSelect={(name) => handleSendMessage(`Show me products in ${name}`)}
          />
        );

      case "cart_update":
        return (
          <CartUpdate
            message={sr.message}
            action={sr.action}
            product_name={sr.product_name}
            onViewCart={() => setIsCartOpen(true)}
          />
        );

      case "order_summary":
        return (
          <OrderSummary
            message={sr.message}
            recipient={sr.recipient}
            delivery={sr.delivery}
            sender={sr.sender}
            items={sr.items}
            delivery_fee={sr.delivery_fee}
            grand_total={sr.grand_total}
            onConfirm={() => handleSendMessage("Yes, proceed and create the order.")}
          />
        );

      case "order_created":
        return (
          <OrderCreated
            message={sr.message}
            checkout_url={sr.checkout_url}
            order_ref={sr.order_ref}
            expires_at={sr.expires_at}
            totals={sr.totals}
            onProceed={(url) => setPaymentUrl(url)}
          />
        );

      case "track_order":
        return (
          <TrackOrder
            message={sr.message}
            order_ref={sr.order_ref}
            status={sr.status}
            timeline={sr.timeline}
            recipient={sr.recipient}
            delivery={sr.delivery}
            payment={sr.payment}
            items={sr.items}
          />
        );

      case "text":
      default:
        return (
          <div
            className="glass-panel"
            style={{
              background: "#ffffff",
              padding: "14px 18px",
              borderRadius: "16px 16px 16px 4px",
              color: "#333",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              border: "1px solid var(--glass-border)",
              maxWidth: "88%"
            }}
          >
            {renderFormattedText(sr.message)}
          </div>
        );
    }
  };

  // ─────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      <div className="animated-bg"></div>
      <div className="blob-3"></div>

      {/* Top Branded Header */}
      <header style={{ width: "100%", padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", zIndex: 100 }}>
        <img
          src="/kapruka-logo.webp"
          alt="Kapruka"
          style={{ height: "auto", width: "160px" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={resetChat}
            style={{ background: "#5322B8", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", color: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
            aria-label="Reset Chat"
          >
            <RotateCcw size={24} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setIsCartOpen(true)}
            style={{ position: "relative", background: "#5322B8", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", color: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
            aria-label="Cart"
          >
            {cartItems.length > 0 && (
              <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "linear-gradient(to bottom right, #facc15, #eab308)", color: "#fff", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: "0.75rem", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
            <ShoppingCart size={24} strokeWidth={1.5} />
          </button>
          <button
            style={{ background: "#5322B8", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", color: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
            aria-label="Settings"
          >
            <Settings size={24} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">

        {/* Cart Slide-out Panel */}
        <div
          className={`sidebar-overlay ${isCartOpen ? "open" : ""}`}
          onClick={() => setIsCartOpen(false)}
          style={{ zIndex: 199, display: isCartOpen ? "block" : "none" }}
        />
        <div
          className="glass-card"
          style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "350px", maxWidth: "90vw", zIndex: 200,
            transform: isCartOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.3s ease",
            display: "flex", flexDirection: "column",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0", background: "rgba(34, 19, 69, 0.95)"
          }}
        >
          <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: "#fff", fontSize: "1.2rem", margin: 0 }}>Your Cart</h2>
            <button onClick={() => setIsCartOpen(false)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.5rem" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {isCartLoading ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center" }}>Loading cart...</div>
            ) : cartItems.length === 0 ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center" }}>Your cart is empty.</div>
            ) : (
              cartItems.map(item => (
                <div key={item.product_id} style={{ display: "flex", gap: "12px", background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "12px", alignItems: "center" }}>
                  {(item.image_url || item.image) ? <img src={item.image_url || item.image} alt={item.product_name} style={{ width: 60, height: 60, objectFit: "contain", background: "#fff", borderRadius: "8px" }} /> : <div style={{ width: 60, height: 60, background: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: "0.9rem", fontWeight: "bold", marginBottom: "6px" }}>{item.product_name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.1)", borderRadius: "6px" }}>
                        <button onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)} style={{ background: "transparent", color: "#fff", border: "none", padding: "2px 8px", cursor: "pointer", fontSize: "1rem" }}>-</button>
                        <span style={{ color: "#fff", fontSize: "0.85rem", minWidth: "20px", textAlign: "center", fontWeight: "bold" }}>{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)} style={{ background: "transparent", color: "#fff", border: "none", padding: "2px 8px", cursor: "pointer", fontSize: "1rem" }}>+</button>
                      </div>
                      <div style={{ color: "var(--brand-yellow)", fontSize: "0.9rem", fontWeight: "bold" }}>
                        {item.price ? `${(item.price * item.quantity).toLocaleString()} LKR` : "N/A"}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Remove item">🗑</button>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontSize: "1.1rem", fontWeight: "bold", marginBottom: "16px" }}>
              <span>Total:</span>
              <span style={{ color: "var(--brand-yellow)" }}>{cartItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toLocaleString()} LKR</span>
            </div>
            <button
              onClick={handleCartCheckout}
              disabled={cartItems.length === 0}
              className="glow-button"
              style={{ width: "100%", background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", border: "none", padding: "14px", borderRadius: "8px", fontWeight: 700, fontSize: "1rem", cursor: cartItems.length === 0 ? "not-allowed" : "pointer", opacity: cartItems.length === 0 ? 0.5 : 1 }}
            >
              Checkout Now
            </button>
          </div>
        </div>

        {/* Chat Section */}
        <section className={`glass-card chat-section ${messages.length === 0 ? "empty" : ""}`} style={{ background: "transparent" }}>

          {messages.length === 0 ? (
            // ── KIKO UI Empty State ──
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "20px", position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
                <div className="float-rotate-animation">
                  <img
                    src="/chatbot-logo.png"
                    alt="Kapruka AI Chatbot"
                    style={{ width: "128px", height: "128px" }}
                  />
                </div>
              </div>

              <div style={{ textAlign: "center", maxWidth: "800px", marginBottom: "32px" }}>
                <h1 style={{ fontSize: "2.8rem", fontWeight: 700, lineHeight: 1.2, color: "#2D2375" }}>
                  Hi I'm <span style={{ color: "#5322B8" }}>KIKO</span>, Ready to<br />Help Shopping?
                </h1>
              </div>

              <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto 24px auto" }}>
                <div className="search-glow" style={{ background: "#fff", borderRadius: "999px", padding: "12px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <img src="/chatbot-logo.png" alt="Kiko" style={{ width: "24px", height: "24px", flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Ask anything you want..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#374151", fontSize: "1rem", outline: "none" }}
                  />
                  <button onClick={toggleListening} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
                    <Mic size={20} color={isListening ? "#ef4444" : "currentColor"} />
                  </button>
                  <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
                    <Paperclip size={20} />
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
                {['Birthday Gifts', 'Flowers', 'Cakes', 'Chocolates', 'Groceries', 'Check Delivery'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSendMessage(`Show me ${cat}`)}
                    style={{ background: "#5322B8", color: "#fff", border: "none", borderRadius: "999px", padding: "6px 18px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div style={{ position: "absolute", bottom: "32px", left: 0, right: 0, textAlign: "center", fontSize: "0.8rem", color: "#6b7280" }}>
                Powered by <span style={{ color: "#5322B8", fontWeight: "bold" }}>Kapruka MCP</span> • Build by <a href="https://www.jayashan.online/" target="_blank" rel="noopener noreferrer" style={{ color: "#5322B8", fontWeight: "bold", textDecoration: "none" }}>Jayashan Manodya</a>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Feed */}
              <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>

                  {/* Deduplicate consecutive assistant messages */}
                  {(() => {
                    const deduped: typeof messages = [];
                    messages.forEach((msg, i) => {
                      if (msg.role === "assistant" && i + 1 < messages.length && messages[i + 1].role === "assistant") return;
                      if (msg.role !== "system") deduped.push(msg);
                    });
                    return deduped;
                  })().map((msg, index) => {
                    if (msg.hidden) return null;
                    const isUser = msg.role === "user";
                    const isTool = msg.role === "tool";

                    // Tool badges
                    if (isTool) {
                      if (msg.name === "search_products") return (
                        <div key={index} className="animate-fade-in" style={{ alignSelf: "flex-start", margin: "2px 8px" }}>
                          <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>Searched Kapruka products</span>
                        </div>
                      );
                      if (msg.name === "get_product") return (
                        <div key={index} className="animate-fade-in" style={{ alignSelf: "flex-start", margin: "2px 8px" }}>
                          <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>Retrieved product details</span>
                        </div>
                      );
                      return null;
                    }

                    if (!msg.content && !msg.structured_response) return null;

                    // User message
                    if (isUser) {
                      return (
                        <div key={index} className="animate-fade-in" style={{ alignSelf: "flex-end", maxWidth: "75%", display: "flex", flexDirection: "row", alignItems: "flex-end", gap: "10px" }}>
                          <div style={{ background: "var(--brand-purple-light)", padding: "14px 18px", borderRadius: "16px 16px 4px 16px", color: "#fff", fontSize: "0.95rem", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere", border: "none" }}>
                            {renderFormattedText(msg.content)}
                          </div>
                        </div>
                      );
                    }

                    // Assistant message — use structured_response if available, else try to parse content, else plain text
                    const sr: AgentResponse | null =
                      msg.structured_response ||
                      parseStructuredResponse(msg.content) ||
                      (msg.content ? { type: "text", message: msg.content } : null);

                    if (!sr) return null;

                    return (
                      <div key={index} className="animate-fade-in" style={{ alignSelf: "flex-start", maxWidth: "100%", display: "flex", flexDirection: "row", alignItems: "flex-end", gap: "10px", width: "100%" }}>
                        <img src="/agent_photo.png" alt="Kapruka Agent" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 }}>
                          {renderStructuredResponse(sr, index)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isLoading && (
                    <div style={{ alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "4px" }}>KAPRUKA AGENT</span>
                      <div className="glass-panel" style={{ padding: "14px 20px", borderRadius: "16px 16px 16px 4px", display: "flex", gap: "6px", alignItems: "center" }}>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} style={{ height: "100px" }} />
                </div>
              </div>

              {/* Input Bar (Floating) */}
              <div style={{ 
                position: "absolute", 
                bottom: 0, 
                left: 0, 
                right: 0, 
                padding: "20px 24px", 
                display: "flex", 
                justifyContent: "center",
                background: "transparent",
                pointerEvents: "none",
                zIndex: 10
              }}>
                <div style={{ 
                  display: "flex", 
                  gap: "12px", 
                  position: "relative", 
                  alignItems: "center", 
                  background: "#fff", 
                  padding: "8px 16px", 
                  borderRadius: "30px", 
                  width: "100%", 
                  maxWidth: "800px", 
                  border: "1px solid #d1d5db",
                  pointerEvents: "auto"
                }}>
                  <button style={{ background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666", padding: "8px", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                  </button>
                  <input
                    type="text"
                    placeholder="Ask Kapruka Agent..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#333", fontSize: "1rem", outline: "none", height: "40px" }}
                  />
                  <button
                    onClick={toggleListening}
                    disabled={isLoading}
                    className={`glow-button ${isListening ? "listening" : ""}`}
                    style={{ background: isListening ? "#ef4444" : "var(--brand-purple-dark)", color: "#fff", border: "none", borderRadius: "50%", width: "44px", height: "44px", padding: 0, cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}
                    id="send-msg-btn"
                  >
                    {isListening
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Payment iframe overlay */}
      {paymentUrl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", width: "90vw", maxWidth: "600px", height: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>Secure Checkout</span>
              <button onClick={() => { setPaymentUrl(null); setShowPostPaymentDialog(true); }} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7280" }}>×</button>
            </div>
            <iframe src={paymentUrl} style={{ flex: 1, border: "none" }} title="Kapruka Checkout" />
          </div>
        </div>
      )}

      {/* Post-payment dialog */}
      {showPostPaymentDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "16px" }}>🎉</div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "12px", color: "#1e1b4b" }}>Did you complete the payment?</h2>
            <p style={{ color: "#6b7280", marginBottom: "24px", fontSize: "0.95rem" }}>Let us know so we can clear your cart and update your order status.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handlePaymentSuccess} style={{ flex: 1, background: "#4c1d95", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Yes, I paid!</button>
              <button onClick={handlePaymentPending} style={{ flex: 1, background: "transparent", color: "#4c1d95", border: "1px solid #4c1d95", padding: "12px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Not yet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
