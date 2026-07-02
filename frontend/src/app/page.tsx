"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import UserProfile from "./components/UserProfile";

// Types
interface Message {
  role: "user" | "assistant" | "tool" | "system" | "unknown";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

interface NormalizedProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  inStock: boolean;
  url?: string;
  description: string;
}

interface ChatThread {
  thread_id: string;
  title: string;
  updated_at: string;
}

// Logo Component
function KaprukaLogo() {
  return (
    <div className="flex items-center gap-1 bg-[#37246b] px-4 py-2 rounded-xl font-extrabold text-white tracking-tight select-none border border-purple-500/20" style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: "1.25rem", display: "inline-flex", alignItems: "center" }}>
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

// Robust parser for tool results (JSON in message string)
const parseToolResult = (content: string) => {
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(trimmed);
    }

    // Look for text='{...}' or text='[...]'
    const textMatch = content.match(/text='([\[\{][\s\S]*?[\]\}])'/);
    if (textMatch && textMatch[1]) {
      const cleanText = textMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      return JSON.parse(cleanText);
    }

    // Look for text="{...}" or text="[...]"
    const textMatchDbl = content.match(/text="([\[\{][\s\S]*?[\]\}])"/);
    if (textMatchDbl && textMatchDbl[1]) {
      const cleanText = textMatchDbl[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      return JSON.parse(cleanText);
    }

    // Generic regex lookup
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      let jsonCandidate = content.substring(firstBrace, lastBrace + 1);
      jsonCandidate = jsonCandidate
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      return JSON.parse(jsonCandidate);
    }
  } catch (e) {
    // Silently fail if we cannot parse the tool result, avoiding Next.js dev overlay popups
    // console.error("Failed to parse tool result JSON:", e);
  }
  return null;
};

// Dynamically build productCache from the message history
const getProductCache = (msgs: Message[]) => {
  const cache: Record<string, NormalizedProduct> = {};
  msgs.forEach((msg) => {
    if (msg.role === "tool") {
      const parsed = parseToolResult(msg.content);
      if (!parsed) return;

      if (msg.name === "search_products" && parsed.results) {
        parsed.results.forEach((item: any) => {
          if (item.id) {
            cache[item.id.toLowerCase()] = {
              id: item.id,
              name: item.name || "Unknown Product",
              image: item.image_url || "",
              price: item.price?.amount || 0,
              inStock: item.in_stock === true,
              url: item.url || "",
              description: item.description || ""
            };
          }
        });
      } else if (msg.name === "get_product") {
        const pId = parsed.id || parsed.product_id;
        if (pId) {
          cache[pId.toLowerCase()] = {
            id: pId,
            name: parsed.name || "Unknown Product",
            image: parsed.images?.[0] || parsed.image_url || "",
            price: parsed.price?.amount || 0,
            inStock: parsed.stock_level !== "out_of_stock" && parsed.in_stock !== false,
            url: parsed.url || "",
            description: parsed.description || ""
          };
        }
      }
    }
  });
  return cache;
};

const extractProductIds = (text: string, cache: Record<string, NormalizedProduct>) => {
  if (!text) return [];
  const normalizedText = text.toLowerCase();
  // Do not extract product IDs if this looks like a checkout/order confirmation response
  if (/checkout_url|order_ref|expires_at|checkout url/i.test(text)) return [];
  const ids: string[] = [];

  Object.keys(cache).forEach((cachedId) => {
    if (normalizedText.includes(cachedId)) {
      ids.push(cachedId);
    }
  });

  // Sort them by the order they appear in the text
  return ids.sort((a, b) => normalizedText.indexOf(a) - normalizedText.indexOf(b));
};

const extractCheckoutInfo = (text: string) => {
  if (!text) return null;

  let url = null;
  const directMatch = text.match(/https?:\/\/[\w./?=&%-]*kapruka\.com\/(?:checkout|payment|pay)[\w./?=&%-]*/i);
  const keywordMatch = text.match(/checkout[_\s]?url[:\s]+([^\s,\n]+)/i);

  if (directMatch) {
    url = directMatch[0];
  } else if (keywordMatch) {
    url = keywordMatch[1];
  }

  const refMatch = text.match(/order[_\s]?ref[:\s]*([A-Z0-9\-_]+)/i);
  const expiresMatch = text.match(/expires[_\s]?at[:\s]*([^\n,]+)/i);

  if (!url && !refMatch) return null;

  return {
    url: url,
    ref: refMatch?.[1] ?? null,
    expires: expiresMatch?.[1]?.trim() ?? null,
  };
};

const cleanAssistantText = (content: string, extractedIds: string[]) => {
  if (!content) return "";
  if (extractedIds.length === 0) return content.trim();

  const lines = content.split("\n");
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return true;

    // 1. Matches markdown image: ![alt](url)
    if (/!\[.*?\]\(.*?\)/.test(trimmed)) return false;

    // 2. Matches markdown link: [text](url)
    if (/\[.*?\]\(.*?\)/.test(trimmed)) return false;

    // 3. Matches numbered list header for a product, e.g. "1. **Name**" or "1. Name"
    if (/^\d+[\.\)-]\s+(\*\*|)/.test(trimmed)) return false;

    // 4. Matches specification bullets like "- **Price:** 500 LKR" or "- Price: 500 LKR"
    if (/^[-*]\s+\*\*.*?\*\*/i.test(trimmed) || /^[-*]\s+[A-Za-z\s]+:/i.test(trimmed)) return false;

    // 5. Matches sub-bullets/indented lines in spec details, e.g. "  - Satisfying crunchy texture"
    if (/^\s+[-*]\s+/.test(line)) return false;

    // 6. Matches standalone product ID lines, price lines, stock status, url links
    if (/product id/i.test(trimmed) ||
      /product link/i.test(trimmed) ||
      /lkr/i.test(trimmed) ||
      /stock status/i.test(trimmed) ||
      /price:/i.test(trimmed) ||
      /http/i.test(trimmed)) {
      return false;
    }

    return true;
  });

  return filteredLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} style={{ fontWeight: 800, color: "#fff" }}>{part}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};

const SearchableSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: string[], placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(value); // reset to selected value if clicked outside
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
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "rgba(34, 19, 69, 0.6)", border: "1px solid var(--glass-border)",
          borderRadius: "10px", padding: "12px", color: "#fff", outline: "none", boxSizing: "border-box"
        }}
      />
      {isOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, background: "rgba(20, 10, 45, 0.95)",
          border: "1px solid var(--glass-border)", borderRadius: "10px", marginTop: "4px",
          maxHeight: "200px", overflowY: "auto", zIndex: 1000,
          backdropFilter: "blur(10px)"
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "10px", color: "var(--text-muted)", fontSize: "0.9rem" }}>No city found...</div>
          ) : (
            filtered.map(opt => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: "10px 12px", color: "#fff", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: opt === value ? "rgba(255,255,255,0.1)" : "transparent"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={(e) => e.currentTarget.style.background = opt === value ? "rgba(255,255,255,0.1)" : "transparent"}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const { data: session, status } = useSession();

  // States
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your Kapruka Shopping Agent. I can help you find, compare, and inspect the best products in Sri Lanka. Log in with Google to save your chats and orders, or just start chatting!"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [threadId, setThreadId] = useState("session_default");
  const [isLoading, setIsLoading] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    address: "",
    city: "",
    date: "",
    phone: "",
    giftMessage: ""
  });
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showPostPaymentDialog, setShowPostPaymentDialog] = useState(false);
  const [currentOrderRef, setCurrentOrderRef] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatThread[]>([]);
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);
  const [activeChatMenu, setActiveChatMenu] = useState<string | null>(null);

  const handleRenameChat = async (id: string, currentTitle: string) => {
    const newTitle = prompt("Enter new title for the chat:", currentTitle);
    if (!newTitle || newTitle === currentTitle) {
      setActiveChatMenu(null);
      return;
    }
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";
    try {
      await fetch(`${apiBaseUrl}/api/chat/${id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
      fetchChats();
    } catch (e) {
      console.error("Failed to rename chat", e);
    }
    setActiveChatMenu(null);
  };

  const handleDeleteChat = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chat?")) {
      setActiveChatMenu(null);
      return;
    }
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";
    try {
      await fetch(`${apiBaseUrl}/api/chat/${id}`, {
        method: "DELETE"
      });
      if (threadId === id) {
        startNewChat();
      }
      fetchChats();
    } catch (e) {
      console.error("Failed to delete chat", e);
    }
    setActiveChatMenu(null);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const fetchChats = async () => {
    if (!session?.user?.email) return;
    setIsSidebarLoading(true);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";
    try {
      const res = await fetch(`${apiBaseUrl}/api/chats/${session.user.email}`, { cache: "no-store" });
      const data = await res.json();
      if (data.chats) {
        setChatHistory(data.chats);
      }
    } catch (e) {
      console.error("Failed to fetch chats", e);
    } finally {
      setIsSidebarLoading(false);
    }
  };

  const fetchCart = async () => {
    if (!session?.user?.email) return;
    setIsCartLoading(true);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";
    try {
      const res = await fetch(`${apiBaseUrl}/api/cart/${session.user.email}`, { cache: "no-store" });
      const data = await res.json();
      if (data.cart) {
        setCartItems(data.cart);
      }
    } catch (e) {
      // Use console.warn instead of console.error to prevent Next.js from showing a dev overlay 
      // when the backend server is temporarily restarting or offline.
      console.warn("Failed to fetch cart: Backend might be temporarily unavailable.");
    } finally {
      setIsCartLoading(false);
    }
  };

  const addToCart = async (item: any) => {
    if (!session?.user?.email) {
      setShowLoginModal(true);
      return;
    }
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";
    try {
      await fetch(`${apiBaseUrl}/api/cart/${encodeURIComponent(session.user.email)}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: item.id,
          product_name: item.name,
          price: item.price || 0,
          image: item.image || "",
        }),
      });
      fetchCart(); // Refresh cart to get new quantities
      setIsCartOpen(true);
    } catch (e) {
      console.error("Failed to add to cart", e);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!session?.user?.email) return;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";
    try {
      await fetch(`${apiBaseUrl}/api/cart/${encodeURIComponent(session.user.email)}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId })
      });
      fetchCart();
    } catch (e) {
      console.error("Failed to remove from cart", e);
    }
  };

  const updateCartQuantity = async (productId: string, quantity: number) => {
    if (!session?.user?.email) return;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";
    try {
      await fetch(`${apiBaseUrl}/api/cart/${encodeURIComponent(session.user.email)}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity })
      });
      fetchCart();
    } catch (e) {
      console.error("Failed to update cart quantity", e);
    }
  };

  const handleCartCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false);
    setShowCheckoutModal(true);
  };

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const submitCheckoutForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckoutLoading(true);

    const checkoutPayload = {
      name: checkoutForm.name,
      phone: checkoutForm.phone,
      gift_message: checkoutForm.giftMessage || undefined,
      delivery: {
        address: checkoutForm.address,
        city: checkoutForm.city,
        date: checkoutForm.date
      },
      cart: cartItems,
      thread_id: threadId
    };

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";

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
        // Inject a synthetic assistant message to display the checkout URL using existing UI
        const syntheticMsg: Message = {
          role: "assistant",
          content: `Your order has been created successfully! 🎉\n\nOrder Ref: ${data.order_ref}\nCheckout URL: ${data.checkout_url}`
        };
        setMessages((prev) => [...prev, syntheticMsg]);
        setCurrentOrderRef(data.order_ref);
        setCheckoutForm({ name: "", address: "", city: "", date: "", phone: "", giftMessage: "" });
      }
    } catch (e) {
      console.error("Checkout failed:", e);
      alert("Network error. Please try again.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPostPaymentDialog(false);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";

    // Clear cart in backend if user is logged in
    if (session?.user?.email) {
      try {
        await fetch(`${apiBaseUrl}/api/cart/${session.user.email}/clear`, { method: "POST" });
      } catch (e) {
        console.error("Failed to clear cart in backend:", e);
      }
    }

    // Clear local cart state
    setCartItems([]);

    const msgContent = `Thank you for confirming! I have cleared your cart for you. You can track your order status anytime using your Order Reference: **${currentOrderRef || "See Above"}**`;

    // Persist to chat database
    try {
      await fetch(`${apiBaseUrl}/api/chat/${threadId}/system_message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgContent })
      });
    } catch (e) {
      console.error("Failed to persist system message:", e);
    }

    // Inject success agent message locally for instant UI update
    const syntheticMsg: Message = {
      role: "assistant",
      content: msgContent
    };
    setMessages((prev) => [...prev, syntheticMsg]);
  };

  const handlePaymentPending = () => {
    setShowPostPaymentDialog(false);

    // Show a popup alert instead of injecting an agent message
    alert("No worries! You can click 'Proceed to Checkout' on the Order Confirmation Card whenever you are ready to complete your payment.");
  };

  const loadChat = async (id: string) => {
    setThreadId(id);
    setIsSidebarOpen(false);
    setIsLoading(true);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/${id}`);
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        setMessages(data.history);
      } else {
        setMessages([{ role: "assistant", content: "Ayubowan! Ready to continue our chat." }]);
      }
    } catch (e) {
      console.error("Failed to load chat", e);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    const newId = "session_" + Math.random().toString(36).substring(2, 9);
    setThreadId(newId);
    setIsSidebarOpen(false);
    const firstName = session?.user?.name?.split(" ")[0] || "there";
    setMessages([
      {
        role: "assistant",
        content: `Ayubowan! 🙏 Welcome back, ${firstName}! Great to see you again. I'm your personal Kapruka Shopping Agent - ready to help you find the perfect gifts, check deliveries, or track your orders. What shall we do today?`
      }
    ]);
  };

  // When user logs in, load chat history and start a new session
  useEffect(() => {
    if (session?.user?.email) {
      setShowLoginModal(false);
      fetchCart();
      if (!welcomed) {
        startNewChat();
        fetchChats();
        setWelcomed(true);
      }
    } else if (status === "unauthenticated" && !welcomed) {
      const randomSession = "session_" + Math.random().toString(36).substring(2, 9);
      setThreadId(randomSession);
      // Show login advice modal after a short delay for guests
      setTimeout(() => setShowLoginModal(true), 1200);
    }
  }, [session, status]);

  // Submit Message handler
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Add user message
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://kapuruka-shopping-agent-backend.vercel.app";

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          thread_id: threadId,
          user_email: session?.user?.email ?? null,
        })
      });

      if (!response.ok) {
        throw new Error("Server responded with error status: " + response.status);
      }

      const data = await response.json();
      if (data.history && data.history.length > 0) {
        // Update entire history to capture tool message nodes
        setMessages(data.history);
      } else if (data.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      }

      // Auto-save order numbers found in the response (checkout flow)
      if (session?.user?.email && data.response) {
        const orderMatches = data.response.match(/order[_\s-]?(?:ref|number|#)?[:\s]*([A-Z0-9\-]{6,20})/gi);
        if (orderMatches) {
          const orderNum = orderMatches[0].replace(/^.*?([A-Z0-9\-]{6,20})$/i, "$1");
          await fetch(`${apiBaseUrl}/api/orders/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_email: session.user.email, order_number: orderNum })
          }).catch(() => { }); // silent fail
        }
      }

      // Refresh sidebar if logged in
      if (session?.user?.email) {
        fetchChats();
        fetchCart(); // Ensure the cart is always up to date if the agent modifies it
      }
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Aiyo! ⚠️ I had trouble connecting to the backend server. Please try again later. (${error.message})` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(inputText);
    }
  };


  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Top Branded Header */}
      <header className="glass-panel header-container">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open Menu"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <KaprukaLogo />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {session?.user && (
            <button
              onClick={() => setIsCartOpen(true)}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "8px 12px", color: "#fff", cursor: "pointer", display: "flex", gap: "8px", alignItems: "center" }}
            >
              🛒 Cart
              {cartItems.length > 0 && (
                <span style={{ background: "var(--brand-yellow)", color: "#000", padding: "2px 6px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </button>
          )}
          <UserProfile onTrackOrder={(msg) => handleSendMessage(msg)} />
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">

        {/* Mobile Sidebar Overlay */}
        <div
          className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Cart Slide-out Panel */}
        <div
          className={`sidebar-overlay ${isCartOpen ? 'open' : ''}`}
          onClick={() => setIsCartOpen(false)}
          style={{ zIndex: 199, display: isCartOpen ? 'block' : 'none' }}
        />
        <div
          className={`glass-card`}
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
                  {item.image ? (
                    <img src={item.image} alt={item.product_name} style={{ width: 60, height: 60, objectFit: "contain", background: "#fff", borderRadius: "8px" }} />
                  ) : (
                    <div style={{ width: 60, height: 60, background: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                  )}
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
                  <button onClick={() => removeFromCart(item.product_id)} style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Remove item">
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", fontSize: "1.1rem", fontWeight: "bold", marginBottom: "16px" }}>
              <span>Total:</span>
              <span style={{ color: "var(--brand-yellow)" }}>
                {cartItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toLocaleString()} LKR
              </span>
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

        {/* Left Sidebar Chat History */}
        <section className={`glass-card sidebar ${isSidebarOpen ? 'open' : ''}`}>

          <button
            onClick={startNewChat}
            className="glow-button"
            style={{ width: "100%", background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>+</span> New Chat
          </button>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
            <span style={{ fontSize: "0.75rem", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px", paddingLeft: "8px" }}>
              Recent Chats
            </span>

            {session?.user ? (
              isSidebarLoading ? (
                <div style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading chats...</div>
              ) : chatHistory.length > 0 ? (
                chatHistory.map((chat) => (
                  <div key={chat.thread_id} style={{ display: "flex", alignItems: "center", position: "relative" }}>
                    <button
                      onClick={() => loadChat(chat.thread_id)}
                      style={{
                        flex: 1,
                        background: threadId === chat.thread_id ? "rgba(255,255,255,0.1)" : "transparent",
                        border: "none",
                        padding: "12px",
                        borderRadius: "8px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "#fff",
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => { if (threadId !== chat.thread_id) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
                      onMouseLeave={(e) => { if (threadId !== chat.thread_id) e.currentTarget.style.background = "transparent" }}
                    >
                      {chat.title}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveChatMenu(activeChatMenu === chat.thread_id ? null : chat.thread_id);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        padding: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        width: "30px",
                        height: "30px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      ⋮
                    </button>
                    {activeChatMenu === chat.thread_id && (
                      <div
                        style={{
                          position: "absolute",
                          right: "30px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "rgba(20, 10, 45, 0.95)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: "8px",
                          padding: "4px",
                          display: "flex",
                          flexDirection: "column",
                          zIndex: 10,
                          minWidth: "100px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                        }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRenameChat(chat.thread_id, chat.title); }}
                          style={{
                            background: "transparent", border: "none", color: "#fff", padding: "8px",
                            textAlign: "left", cursor: "pointer", fontSize: "0.85rem", borderRadius: "4px"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          Rename
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.thread_id); }}
                          style={{
                            background: "transparent", border: "none", color: "#ef4444", padding: "8px",
                            textAlign: "left", cursor: "pointer", fontSize: "0.85rem", borderRadius: "4px"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: "0.85rem" }}>No previous chats.</div>
              )
            ) : (
              <div style={{ padding: "12px 8px", color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                Log in with Google to save and view your chat history.
              </div>
            )}
          </div>
        </section>

        {/* Right Section Chat Interface */}
        <section className="glass-card chat-section">

          {/* Active Chat Header */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "12px", background: "rgba(34, 19, 69, 0.3)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }}></div>
            <span style={{ fontWeight: 600, color: "#fff" }}>Kapruka Shopping Assistant</span>
          </div>

          {/* Messages Feed Container */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Quick-action chips - only shown on welcome screen (1 message, no user input yet) */}
            {messages.length === 1 && !isLoading && (() => {
              const chips = session?.user?.name ? [
                { icon: "🎁", label: "Find a gift for someone special", msg: "I need a gift idea for someone special" },
                { icon: "🍫", label: "Search chocolates & sweets", msg: "Show me chocolate gift boxes" },
                { icon: "🌸", label: "Browse flowers & bouquets", msg: "Search for flower bouquets" },
                { icon: "📦", label: "Track my recent order", msg: "I want to track my recent order" },
                { icon: "🚚", label: "Check delivery to my city", msg: "Check delivery availability for my city" },
              ] : [
                { icon: "🎁", label: "Find a gift idea", msg: "I need a gift idea" },
                { icon: "🍫", label: "Search chocolates", msg: "Show me chocolate gift boxes" },
                { icon: "🌸", label: "Browse flowers", msg: "Search for flower bouquets" },
                { icon: "🎂", label: "Order a birthday cake", msg: "I want to order a birthday cake" },
              ];
              return (
                <div className="animate-fade-in" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
                  {chips.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(chip.msg)}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "#fff", padding: "9px 16px", borderRadius: "24px",
                        fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(255,210,0,0.12)";
                        e.currentTarget.style.borderColor = "rgba(255,210,0,0.4)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                      }}
                    >
                      <span>{chip.icon}</span>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              );
            })()}

            {(() => {
              // Deduplicate: collapse consecutive assistant messages — keep only the last one
              const deduped: typeof messages = [];
              messages.forEach((msg, i) => {
                if (
                  msg.role === "assistant" &&
                  i + 1 < messages.length &&
                  messages[i + 1].role === "assistant"
                ) {
                  return; // skip — a newer assistant message follows
                }
                if (msg.role !== "system") deduped.push(msg);
              });
              return deduped;
            })()
              .map((msg, index) => {
                const isUser = msg.role === "user";
                const isTool = msg.role === "tool";

                // Get the product cache from history
                const cache = getProductCache(messages);

                if (isTool) {
                  // Render tool messages as clean, compact system badges instead of full grids
                  if (msg.name === "search_products") {
                    return (
                      <div key={index} className="animate-fade-in" style={{ alignSelf: "flex-start", margin: "4px 4px" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.05)", padding: "6px 12px", borderRadius: "12px", border: "1px solid var(--glass-border)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "var(--brand-yellow)" }}>🔍</span> Searched Kapruka products
                        </span>
                      </div>
                    );
                  }

                  if (msg.name === "get_product") {
                    return (
                      <div key={index} className="animate-fade-in" style={{ alignSelf: "flex-start", margin: "4px 4px" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.05)", padding: "6px 12px", borderRadius: "12px", border: "1px solid var(--glass-border)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "var(--brand-yellow)" }}>📦</span> Retrieved product details
                        </span>
                      </div>
                    );
                  }

                  return null; // Skip rendering other tool calls to keep chat clean
                }

                // Render Normal messages
                if (!msg.content) return null; // Skip empty tool triggers

                if (isUser) {
                  return (
                    <div
                      key={index}
                      className="animate-fade-in"
                      style={{
                        alignSelf: "flex-end",
                        maxWidth: "75%",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "flex-end",
                        gap: "10px"
                      }}
                    >
                      <div
                        style={{
                          background: "var(--brand-purple-light)",
                          padding: "14px 18px",
                          borderRadius: "16px 16px 4px 16px",
                          color: "#fff",
                          fontSize: "0.95rem",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                          border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}
                      >
                        {renderFormattedText(msg.content)}
                      </div>
                      {session?.user?.image ? (
                        <img src={session.user.image} alt="User" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#4b328a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", color: "#fff", fontWeight: "600", flexShrink: 0 }}>U</div>
                      )}
                    </div>
                  );
                }

                // Assistant Message rendering
                const extractedIds = extractProductIds(msg.content, cache);
                const cleanedContent = cleanAssistantText(msg.content, extractedIds);
                const checkoutInfo = extractCheckoutInfo(msg.content);

                return (
                  <div
                    key={index}
                    className="animate-fade-in"
                    style={{
                      alignSelf: "flex-start",
                      maxWidth: "85%",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "flex-end",
                      gap: "10px",
                      width: "100%"
                    }}
                  >
                    <img src="/agent_photo.png" alt="Kapruka Agent" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>

                      {/* Render clean text response if there is any remaining content */}
                      {cleanedContent && (
                        <>
                          <div
                            className="glass-panel"
                            style={{
                              background: "rgba(34, 19, 69, 0.4)",
                              padding: "14px 18px",
                              borderRadius: "16px 16px 16px 4px",
                              color: "#fff",
                              fontSize: "0.95rem",
                              lineHeight: 1.5,
                              whiteSpace: "pre-wrap",
                              border: "1px solid var(--glass-border)",
                              marginBottom: extractedIds.length > 0 ? "12px" : "0",
                              maxWidth: "88%"
                            }}
                          >
                            {renderFormattedText(cleanedContent)}
                          </div>
                          
                          {/* Show a checkout button if the assistant mentions checkout */}
                          {!checkoutInfo && /(?:checkout|check out|place an order|proceed to order)/i.test(cleanedContent) && (
                            <div style={{ marginTop: "8px", marginBottom: "8px" }}>
                              <button
                                onClick={handleCartCheckout}
                                className="glow-button"
                                style={{
                                  background: "var(--brand-yellow)",
                                  color: "var(--brand-purple-dark)",
                                  padding: "10px 18px",
                                  borderRadius: "10px",
                                  fontWeight: 800,
                                  fontSize: "0.95rem",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                              >
                                <span>🛒</span> Open Checkout Form
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Order Confirmation Card */}
                      {checkoutInfo && (
                        <div className="glass-panel animate-fade-in" style={{
                          padding: "20px 24px",
                          borderRadius: "16px",
                          border: "1px solid rgba(245, 158, 11, 0.35)",
                          background: "rgba(34, 19, 69, 0.6)",
                          maxWidth: "420px",
                          marginTop: "8px"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                            <span style={{ fontSize: "1.4rem" }}>🧾</span>
                            <span style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>Order Ready for Checkout</span>
                          </div>

                          {checkoutInfo.ref && (
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Order Reference</div>
                              <div style={{ fontFamily: "monospace", color: "var(--brand-yellow)", fontSize: "0.95rem", fontWeight: 700, marginTop: "2px" }}>{checkoutInfo.ref}</div>
                            </div>
                          )}

                          {checkoutInfo.expires && (
                            <div style={{ marginBottom: "16px" }}>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Expires At</div>
                              <div style={{ color: "#e2d9f3", fontSize: "0.85rem", marginTop: "2px" }}>{checkoutInfo.expires}</div>
                            </div>
                          )}

                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>
                            Note: This reference is temporary. Your final order number will be shown after payment is completed on Kapruka. Please check your email for the final tracking number. If you want to track your order, simply paste that number right here into the chat!
                          </div>

                          {checkoutInfo.url && (
                            <button
                              onClick={() => setPaymentUrl(checkoutInfo.url)}
                              className="glow-button"
                              style={{
                                width: "100%",
                                display: "block",
                                background: "var(--brand-yellow)",
                                color: "var(--brand-purple-dark)",
                                padding: "12px 20px",
                                borderRadius: "10px",
                                fontWeight: 800,
                                fontSize: "0.95rem",
                                textAlign: "center",
                                border: "none",
                                cursor: "pointer"
                              }}
                            >
                              Proceed to Checkout
                            </button>
                          )}
                        </div>
                      )}

                      {/* Render product card(s) under the message */}
                      {!checkoutInfo && extractedIds.length > 0 && (
                        <div style={{ width: "100%", marginTop: "4px" }}>
                          {extractedIds.length === 1 ? (
                            // Detailed layout for single product
                            (() => {
                              const item = cache[extractedIds[0]];
                              return (
                                <div className="glass-panel animate-fade-in" style={{ padding: "20px", display: "flex", gap: "20px", borderRadius: "16px", flexWrap: "wrap", maxWidth: "90%" }}>
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      style={{ width: "180px", height: "180px", objectFit: "contain", borderRadius: "12px", background: "#fff", flexShrink: 0 }}
                                    />
                                  )}
                                  <div style={{ flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                    <div>
                                      <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>{item.name}</h2>
                                      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                                        <span style={{ color: "var(--brand-yellow)", fontWeight: 800, fontSize: "1.2rem" }}>
                                          {item.price ? `${item.price.toLocaleString()} LKR` : "Price N/A"}
                                        </span>
                                        <span style={{ fontSize: "0.75rem", color: item.inStock ? "#10b981" : "#ef4444", background: item.inStock ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", padding: "2px 8px", borderRadius: "6px" }}>
                                          {item.inStock ? "In Stock" : "Out of Stock"}
                                        </span>
                                      </div>
                                      {item.description && (
                                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5, maxHeight: "100px", overflowY: "auto", paddingRight: "6px" }}>
                                          {item.description}
                                        </p>
                                      )}
                                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px", fontFamily: "monospace" }}>
                                        Product ID: {item.id}
                                      </div>
                                    </div>
                                    <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                      <button
                                        onClick={() => addToCart(item)}
                                        className="glow-button"
                                        style={{ background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
                                      >
                                        Add to Cart
                                      </button>

                                      {item.url && (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            background: "rgba(255,255,255,0.07)",
                                            color: "#e2d9f3",
                                            padding: "8px 16px",
                                            borderRadius: "8px",
                                            fontWeight: 600,
                                            fontSize: "0.85rem",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            textDecoration: "none",
                                            border: "1px solid rgba(255,255,255,0.15)"
                                          }}
                                        >
                                          View on Kapruka
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            // Grid layout for multiple products
                            <div className="product-grid" style={{ maxWidth: "100%" }}>
                              {extractedIds.map((id, optIdx) => {
                                const item = cache[id];
                                return (
                                  <div key={item.id} className="glass-panel animate-fade-in" style={{ padding: "12px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px", borderRadius: "14px" }}>
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        style={{ width: "100%", height: "130px", objectFit: "contain", borderRadius: "10px", background: "#fff" }}
                                      />
                                    )}
                                    <div>
                                      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", height: "36px" }}>
                                        {item.name}
                                      </h3>
                                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", fontFamily: "monospace" }}>
                                        ID: {item.id}
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                                        <span style={{ color: "var(--brand-yellow)", fontWeight: 800, fontSize: "0.92rem" }}>
                                          {item.price ? `${item.price.toLocaleString()} LKR` : "Price N/A"}
                                        </span>
                                        <span style={{ fontSize: "0.68rem", color: item.inStock ? "#10b981" : "#ef4444", background: item.inStock ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", padding: "2px 6px", borderRadius: "4px" }}>
                                          {item.inStock ? "In Stock" : "Out of"}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleSendMessage(`Please retrieve details for product ${item.id}`)}
                                      className="glow-button"
                                      style={{ width: "100%", background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", border: "none", padding: "8px", borderRadius: "8px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                                    >
                                      View Details
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            {/* Chatbot Typing Loader */}
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

            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Chat Input Bar */}
          <div style={{ padding: "20px 24px", borderTop: "1px solid var(--glass-border)", background: "rgba(21, 9, 42, 0.4)" }}>
            <div style={{ display: "flex", gap: "12px", position: "relative" }}>
              <input
                type="text"
                placeholder="Ask for chocolate, gifts, flowers, cakes..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "rgba(34, 19, 69, 0.6)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)"
                }}
              />
              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={isLoading || !inputText.trim()}
                className="glow-button"
                style={{
                  background: "var(--brand-yellow)",
                  color: "var(--brand-purple-dark)",
                  border: "none",
                  borderRadius: "14px",
                  padding: "0 24px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: isLoading || !inputText.trim() ? "not-allowed" : "pointer",
                  opacity: isLoading || !inputText.trim() ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                Send
              </button>
            </div>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "10px 24px", color: "var(--text-muted)", fontSize: "0.78rem", borderTop: "1px solid var(--glass-border)", background: "rgba(20, 10, 45, 0.4)" }}>
        &copy; {new Date().getFullYear()} Developed by <a href="https://www.jayashan.online/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-yellow)", fontWeight: 700, textDecoration: "none" }}>Jayashan Manodya</a>. All rights reserved.
      </footer>
      {/* Payment Iframe Modal */}
      {paymentUrl && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(10, 4, 30, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              width: "100%",
              height: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              background: "#fff",
              overflow: "hidden",
              position: "relative"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "var(--brand-purple-dark)", color: "#fff" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Secure Checkout</h2>
              <button onClick={() => { setPaymentUrl(null); setShowPostPaymentDialog(true); }} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.5rem" }}>&times;</button>
            </div>
            <div style={{ flex: 1, position: "relative" }}>
              <iframe
                src={paymentUrl}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Kapruka Secure Checkout"
              />
            </div>
          </div>
        </div>
      )}

      {/* Post-Payment Dialog Modal */}
      {showPostPaymentDialog && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1200,
            background: "rgba(10, 4, 30, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              padding: "36px 40px",
              maxWidth: "400px",
              width: "90%",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              border: "1px solid rgba(255, 210, 0, 0.2)"
            }}
          >
            <div style={{ textAlign: "center", fontSize: "3rem", marginBottom: "-10px" }}>💳</div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", textAlign: "center", margin: 0 }}>
              Payment Status
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, textAlign: "center", margin: 0 }}>
              Did you complete your Kapruka checkout payment successfully?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
              <button
                onClick={handlePaymentSuccess}
                className="glow-button"
                style={{
                  width: "100%", background: "var(--brand-yellow)", color: "var(--brand-purple-dark)",
                  padding: "14px", borderRadius: "10px", fontWeight: 800, border: "none", cursor: "pointer"
                }}
              >
                Yes, I Paid Successfully
              </button>
              <button
                onClick={handlePaymentPending}
                style={{
                  width: "100%", background: "transparent", color: "#fff",
                  padding: "12px", borderRadius: "10px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer"
                }}
              >
                No, Not Yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Form Modal */}
      {showCheckoutModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(10, 4, 30, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              padding: "36px 40px",
              maxWidth: "500px",
              width: "90%",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              border: "1px solid rgba(255, 210, 0, 0.2)",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
          >
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: 0 }}>
              Checkout Details
            </h2>
            <form onSubmit={submitCheckoutForm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Recipient Name *</label>
                <input required type="text" value={checkoutForm.name} onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })} style={{ background: "rgba(34, 19, 69, 0.6)", border: "1px solid var(--glass-border)", borderRadius: "10px", padding: "12px", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Delivery Address *</label>
                <input required type="text" value={checkoutForm.address} onChange={e => setCheckoutForm({ ...checkoutForm, address: e.target.value })} style={{ background: "rgba(34, 19, 69, 0.6)", border: "1px solid var(--glass-border)", borderRadius: "10px", padding: "12px", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>City *</label>
                <SearchableSelect
                  value={checkoutForm.city}
                  onChange={(val) => setCheckoutForm({ ...checkoutForm, city: val })}
                  placeholder="Type to search your city..."
                  options={[
                    "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo 01", "Colombo 02", "Colombo 03", 
                    "Colombo 04", "Colombo 05", "Colombo 06", "Colombo 07", "Colombo 08", "Colombo 09", "Colombo 10", 
                    "Colombo 11", "Colombo 12", "Colombo 13", "Colombo 14", "Colombo 15", "Galle", "Gampaha", 
                    "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", 
                    "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", 
                    "Rathnapura", "Trincomalee", "Vavuniya"
                  ]}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Delivery Date (YYYY-MM-DD) *</label>
                <input required type="date" value={checkoutForm.date} onChange={e => setCheckoutForm({ ...checkoutForm, date: e.target.value })} style={{ background: "rgba(34, 19, 69, 0.6)", border: "1px solid var(--glass-border)", borderRadius: "10px", padding: "12px", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Contact Number *</label>
                <input required type="text" value={checkoutForm.phone} onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })} style={{ background: "rgba(34, 19, 69, 0.6)", border: "1px solid var(--glass-border)", borderRadius: "10px", padding: "12px", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Gift Message (Optional)</label>
                <textarea value={checkoutForm.giftMessage} onChange={e => setCheckoutForm({ ...checkoutForm, giftMessage: e.target.value })} rows={3} style={{ background: "rgba(34, 19, 69, 0.6)", border: "1px solid var(--glass-border)", borderRadius: "10px", padding: "12px", color: "#fff", outline: "none", resize: "none" }} />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowCheckoutModal(false)} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-muted)", padding: "12px", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={isCheckoutLoading} className="glow-button" style={{ flex: 1, background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", border: "none", padding: "12px", borderRadius: "10px", cursor: isCheckoutLoading ? "not-allowed" : "pointer", fontWeight: 800, opacity: isCheckoutLoading ? 0.7 : 1 }}>
                  {isCheckoutLoading ? "Processing..." : "Submit Order Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Advice Modal for guests */}
      {showLoginModal && !session?.user && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(10, 4, 30, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="glass-card animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: "36px 40px",
              maxWidth: "440px",
              width: "90%",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              border: "1px solid rgba(255, 210, 0, 0.2)"
            }}
          >
            <div style={{ textAlign: "center" }}><img src="/favicon.png" alt="Kapruka" style={{ width: "56px", height: "56px", margin: "0 auto", display: "block", borderRadius: "12px" }} /></div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", textAlign: "center", margin: 0 }}>
              Get the Full Experience
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, textAlign: "center", margin: 0 }}>
              Log in with Google to unlock all features:
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                "Save and switch between multiple chats",
                "Track and manage your orders",
                "Secure, personalized shopping sessions",
                "Personalized welcome and recommendations",
              ].map((text) => (
                <li key={text} style={{ fontSize: "0.88rem", color: "#e2d9f3", paddingLeft: "4px" }}>
                  • {text}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px", alignItems: "center" }}>
              <button
                onClick={() => { setShowLoginModal(false); signIn("google"); }}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  background: "#fff",
                  color: "#333",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "var(--text-muted)",
                  padding: "10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
