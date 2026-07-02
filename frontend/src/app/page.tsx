"use client";

import React, { useState, useEffect, useRef } from "react";
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
      return <strong key={index} style={{ fontWeight: 800, color: "inherit" }}>{part}</strong>;
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
  // States
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
  const [loadingMoreIds, setLoadingMoreIds] = useState<Record<number, boolean>>({});


  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const initialTextRef = useRef("");

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
    
    // Use the functional form to get the latest input text
    setInputText((currentInputText) => {
      initialTextRef.current = currentInputText ? currentInputText + " " : "";
      return currentInputText;
    });

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      let finalAndInterim = "";
      for (let i = 0; i < event.results.length; ++i) {
        finalAndInterim += event.results[i][0].transcript;
      }
      
      setInputText(initialTextRef.current + finalAndInterim);

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      silenceTimeoutRef.current = setTimeout(() => {
        recognition.stop();
      }, 2500); // 2.5 seconds of silence
    };
    
    recognition.onerror = (event: any) => {
      if (event.error === "aborted") {
        // Expected when manually stopped or silence timeout stops it
        setIsListening(false);
        return;
      }
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      // Give a tiny delay for React state to update the input text if needed, then click send
      setTimeout(() => {
        const sendBtn = document.getElementById("send-msg-btn") as HTMLButtonElement;
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
        }
      }, 100);
    };

    recognition.start();
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);


  // Load state from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("kapruka_cart");
    if (savedCart) {
      try { setCartItems(JSON.parse(savedCart)); } catch (e) {}
    }
    const savedMessages = localStorage.getItem("kapruka_messages_v2");
    if (savedMessages) {
      try { setMessages(JSON.parse(savedMessages)); } catch (e) {}
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem("kapruka_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem("kapruka_messages_v2", JSON.stringify(messages));
  }, [messages]);

  const fetchCart = () => {
    // No-op, cart is now managed entirely in local state
  };

  const addToCart = (item: any) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === item.id);
      if (existing) {
        return prev.map(i => i.product_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: item.id,
        product_name: item.name,
        price: item.price || 0,
        image: item.image || "",
        quantity: 1
      }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity } : i));
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
        // Inject a synthetic assistant message to display the checkout URL using existing UI
        const syntheticMsg: Message = {
          role: "assistant",
          content: `Your order has been created successfully! 🎉\n\nOrder Ref: ${data.order_ref}\nCheckout URL: ${data.checkout_url}`
        };
        setMessages((prev) => [...prev, syntheticMsg]);
        setCurrentOrderRef(data.order_ref);
        setCheckoutForm({ name: "", address: "", city: "", date: "", phone: "", giftMessage: "" });

        // Save order to localStorage
        try {
          const savedOrders = JSON.parse(localStorage.getItem("kapruka_orders") || "[]");
          savedOrders.unshift({
            id: Date.now(),
            order_number: data.order_ref,
            product_name: cartItems.map(c => c.product_name || c.name).join(", "),
            created_at: new Date().toISOString()
          });
          localStorage.setItem("kapruka_orders", JSON.stringify(savedOrders));
        } catch (e) {
          console.error("Failed to save order to localStorage:", e);
        }
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

    // Clear local cart state
    setCartItems([]);

    const msgContent = `Thank you for confirming! I have cleared your cart for you. You can track your order status anytime using your Order Reference: **${currentOrderRef || "See Above"}**`;

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

  const loadChat = (id: string) => {
    setThreadId(id);
    const savedMessages = localStorage.getItem("kapruka_messages_v2");
    if (!savedMessages) {
      setMessages([]);
    }
  };

  // Load chat on mount
  useEffect(() => {
    fetchCart();
    if (!welcomed) {
      const id = "chat_local";
      loadChat(id);
      setWelcomed(true);
    }
  }, []);

  const resetChat = () => {
    setMessages([]);
    localStorage.removeItem("kapruka_messages_v2");
  };

  // Submit Message handler
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Add user message
    const userMsg: Message = { role: "user", content: text };
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
          messages: updatedMessages,
          user_email: null,
        })
      });

      if (!response.ok) {
        throw new Error("Server responded with error status: " + response.status);
      }

      const data = await response.json();
      if (data.history && data.history.length > 0) {
        // Update entire history to capture AI messages and tool execution logs
        setMessages(data.history);
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

  const handleLoadMore = async (msgIndex: number) => {
    setLoadingMoreIds(prev => ({ ...prev, [msgIndex]: true }));
    try {
      const historyUpToMessage = messages.slice(0, msgIndex + 1).map(m => ({
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        name: m.name,
        tool_call_id: m.tool_call_id
      }));
      
      historyUpToMessage.push({ 
        role: "user", 
        content: "Please provide up to 10 MORE different products for my previous request. DO NOT repeat any of the products you just listed." 
      });

      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyUpToMessage,
          user_email: null,
        })
      });

      if (!response.ok) {
        throw new Error("Server error: " + response.status);
      }

      const data = await response.json();
      if (data.history && data.history.length > 0) {
        const lastMsg = data.history[data.history.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.content) {
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[msgIndex] = {
              ...newMsgs[msgIndex],
              content: newMsgs[msgIndex].content + "\n\n" + lastMsg.content
            };
            return newMsgs;
          });
        }
      }
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setLoadingMoreIds(prev => ({ ...prev, [msgIndex]: false }));
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
      <header className="header-container">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <KaprukaLogo />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={resetChat}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "42px", height: "42px", color: "#fff" }}
            aria-label="Reset Chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
          </button>
          <button
            onClick={() => setIsCartOpen(true)}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "42px", height: "42px", position: "relative" }}
            aria-label="Cart"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartItems.length > 0 && (
              <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", padding: "2px 6px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </button>
          <UserProfile onTrackOrder={(msg) => handleSendMessage(msg)} />
        </div>
      </header>

      {/* Main Container */}
      <main className="main-container">


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


        <section className="glass-card chat-section">

          {messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 20px" }}>
              <h1 style={{ color: "var(--brand-purple-dark)", fontSize: "1.8rem", fontWeight: 600, marginBottom: "40px", textAlign: "center" }}>
                Hey there! Ready to dive into Kapruka?
              </h1>
              <div style={{ width: "100%", maxWidth: "800px" }}>
                <div style={{ display: "flex", gap: "12px", position: "relative", alignItems: "center", background: "#fff", padding: "8px 16px", borderRadius: "30px", width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                  <button
                    style={{
                      background: "transparent",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#666",
                      padding: "8px",
                      flexShrink: 0
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                  </button>
                  <input
                    type="text"
                    placeholder="Ask Kapruka Agent..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: "#333",
                      fontSize: "1rem",
                      outline: "none",
                      height: "40px",
                    }}
                  />
                  <button
                    onClick={toggleListening}
                    disabled={isLoading}
                    className="glow-button"
                    style={{
                      background: "var(--brand-purple-dark)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: "44px",
                      height: "44px",
                      padding: 0,
                      cursor: isLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                    id="send-msg-btn-empty"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </button>
                </div>
                {(() => {
                  const chips = [
                    { icon: "🎁", label: "Find a gift for someone special", msg: "I need a gift for my friend. Can you suggest something under 3000 LKR?" },
                    { icon: "🍫", label: "Search chocolates & sweets", msg: "Show me chocolate boxes available for delivery today." },
                    { icon: "🌸", label: "Browse flowers & bouquets", msg: "Search for flower bouquets for a birthday." },
                    { icon: "🚚", label: "Check delivery availability", msg: "Can you deliver to Kandy today?" },
                  ];
                  return (
                    <div className="animate-fade-in" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginTop: "24px" }}>
                      {chips.map((chip, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(chip.msg)}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            background: "#ffffff",
                            border: "1px solid var(--glass-border)",
                            color: "#333", padding: "9px 16px", borderRadius: "24px",
                            fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
                            transition: "all 0.18s ease",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(255,210,0,0.12)";
                            e.currentTarget.style.borderColor = "rgba(255,210,0,0.4)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.borderColor = "var(--glass-border)";
                          }}
                        >
                          <span>{chip.icon}</span>
                          <span>{chip.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <>


          {/* Messages Feed Container */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Quick-action chips removed from here because they moved to the empty state screen */}

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
                          border: "none"
                        }}
                      >
                        {renderFormattedText(msg.content)}
                      </div>
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
                      maxWidth: "100%",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "flex-end",
                      gap: "10px",
                      width: "100%"
                    }}
                  >
                    <img src="/agent_photo.png" alt="Kapruka Agent" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 }}>

                      {/* Render clean text response if there is any remaining content */}
                      {cleanedContent && (
                        <>
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
                            // Horizontal layout for multiple products
                            <div style={{ 
                                marginTop: "16px", 
                                width: "100vw",
                                position: "relative",
                                left: "50%",
                                right: "50%",
                                marginLeft: "-50vw",
                                marginRight: "-50vw"
                              }}>
                              {/* Header */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingLeft: "max(70px, calc(50vw - 400px + 46px))", paddingRight: "max(24px, calc(50vw - 400px + 24px))" }}>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
                                  {extractedIds.length} PRODUCTS
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "6px" }}>Shift + scroll</span>
                                  <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                      onClick={() => document.getElementById(`carousel-${index}`)?.scrollBy({ left: -260, behavior: "smooth" })}
                                      className="scroll-arrow-btn"
                                      style={{ position: "relative", top: "auto", transform: "none", width: "32px", height: "32px" }}
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                    </button>
                                    <button
                                      onClick={() => document.getElementById(`carousel-${index}`)?.scrollBy({ left: 260, behavior: "smooth" })}
                                      className="scroll-arrow-btn"
                                      style={{ position: "relative", top: "auto", transform: "none", width: "32px", height: "32px" }}
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div id={`carousel-${index}`} className="product-carousel" style={{ paddingLeft: "max(70px, calc(50vw - 400px + 46px))", paddingRight: "max(24px, calc(50vw - 400px + 24px))", boxSizing: "border-box" }}>
                                {extractedIds.map((id, optIdx) => {
                                  const item = cache[id];
                                  return (
                                    <div key={item.id} className="product-card-light animate-fade-in">
                                      {item.image && (
                                        <img
                                          src={item.image}
                                          alt={item.name}
                                          style={{ width: "100%", height: "160px", objectFit: "contain", background: "#fff", marginBottom: "12px" }}
                                        />
                                      )}
                                      <div>
                                        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#221345", height: "38px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.name}</span>
                                          {item.url && (
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                            </a>
                                          )}
                                        </h3>
                                        <div style={{ color: "#111827", fontWeight: 800, fontSize: "1.05rem", marginTop: "12px", marginBottom: "16px" }}>
                                          {item.price ? `${item.price.toLocaleString()} LKR` : "Price N/A"}
                                        </div>
                                      </div>
                                      
                                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                        <button
                                          onClick={() => handleSendMessage(`Please retrieve details for product ${item.id}`)}
                                          style={{ flex: 1, background: "rgba(57, 32, 97, 0.08)", color: "var(--brand-purple)", border: "none", padding: "8px 16px", borderRadius: "20px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", transition: "all 0.2s" }}
                                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(57, 32, 97, 0.15)"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(57, 32, 97, 0.08)"; }}
                                        >
                                          Details <span style={{ fontSize: "0.7rem", marginTop: "2px" }}>❯</span>
                                        </button>
                                        <button
                                          onClick={() => addToCart(item)}
                                          style={{ background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontWeight: 700, fontSize: "1.2rem", transition: "all 0.2s", boxShadow: "0 2px 6px rgba(255,210,0,0.3)" }}
                                          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                                          title="Add to Cart"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                                <button
                                  onClick={() => handleLoadMore(index)}
                                  disabled={loadingMoreIds[index]}
                                  style={{
                                    background: "#ffffff",
                                    border: "1px solid var(--brand-purple)",
                                    color: "var(--brand-purple)",
                                    fontWeight: 600,
                                    padding: "8px 20px",
                                    borderRadius: "20px",
                                    fontSize: "0.85rem",
                                    cursor: loadingMoreIds[index] ? "wait" : "pointer",
                                    transition: "all 0.2s",
                                    opacity: loadingMoreIds[index] ? 0.7 : 1
                                  }}
                                  onMouseEnter={(e) => { if (!loadingMoreIds[index]) e.currentTarget.style.background = "rgba(57, 32, 97, 0.05)"; }}
                                  onMouseLeave={(e) => { if (!loadingMoreIds[index]) e.currentTarget.style.background = "#ffffff"; }}
                                >
                                  {loadingMoreIds[index] ? (
                                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <div className="typing-dot" style={{ width: "6px", height: "6px" }}></div>
                                      <div className="typing-dot" style={{ width: "6px", height: "6px" }}></div>
                                      <div className="typing-dot" style={{ width: "6px", height: "6px" }}></div>
                                    </span>
                                  ) : (
                                    "Load more products"
                                  )}
                                </button>
                              </div>
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
          </div>

          {/* Interactive Chat Input Bar */}
          <div style={{ padding: "20px 24px", display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: "12px", position: "relative", alignItems: "center", background: "#fff", padding: "8px 16px", borderRadius: "30px", width: "100%", maxWidth: "800px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#666",
                  padding: "8px",
                  flexShrink: 0
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input
                type="text"
                placeholder="Ask Kapruka Agent..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#333",
                  fontSize: "1rem",
                  outline: "none",
                  height: "40px",
                }}
              />
              <button
                onClick={toggleListening}
                disabled={isLoading}
                className="glow-button"
                style={{
                  background: "var(--brand-purple-dark)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "44px",
                  height: "44px",
                  padding: 0,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            </div>
          </div>

            </>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "10px 24px", color: "var(--text-muted)", fontSize: "0.78rem", borderTop: "1px solid var(--glass-border)", background: "#f9fafb" }}>
        &copy; {new Date().getFullYear()} Developed by <a href="https://www.jayashan.online/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-purple)", fontWeight: 700, textDecoration: "none" }}>Jayashan Manodya</a>. All rights reserved.
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


    </div>
  );
}
