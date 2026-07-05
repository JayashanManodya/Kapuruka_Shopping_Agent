"use client";

import React, { useState, useEffect, useRef } from "react";
import { RotateCcw, ShoppingCart, Settings, Mic, Paperclip, Send } from "lucide-react";
import UserProfile from "./components/UserProfile";
import RecommendedItems from "./components/responses/RecommendedItems";
import ProductDetail from "./components/responses/ProductDetail";
import OrderSummary from "./components/responses/OrderSummary";
import OrderCreated from "./components/responses/OrderCreated";
import TrackOrder from "./components/responses/TrackOrder";
import ListCategories from "./components/responses/ListCategories";
import CartUpdate from "./components/responses/CartUpdate";
import ReadCart from "./components/responses/ReadCart";
import CheckoutForm from "./components/responses/CheckoutForm";

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
  image_base64?: string;
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
  | { type: "read_cart"; message: string; items: any[]; total: number }
  | { type: "checkout_form"; message: string; recipient_name?: string; phone?: string; address?: string; city?: string; date?: string; sender_name?: string; gift_message?: string; }
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
    let cleanRaw = raw.trim();
    if (cleanRaw.startsWith("```json")) {
      cleanRaw = cleanRaw.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanRaw.startsWith("```")) {
      cleanRaw = cleanRaw.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const obj = JSON.parse(cleanRaw);
    if (obj && typeof obj.type === "string" && typeof obj.message === "string") {
      return obj as AgentResponse;
    }
  } catch (_) { }
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
// Localization
// ─────────────────────────────────────────

const LOCALIZATION: Record<string, {
  landingGreeting: React.ReactNode;
  inputPlaceholderEmpty: string;
  inputPlaceholderFloating: string;
  categories: { original: string; label: string; query?: string }[];
  cartAdded: (name: string) => string;
  orderCreated: string;
  paymentSuccessMsg: string;
  apiErrorMsg: (err: string) => string;
}> = {
  "English": {
    landingGreeting: <>Hi I'm <span style={{ color: "#5322B8" }}>KIKO</span>, Ready to<br />Help Shopping?</>,
    inputPlaceholderEmpty: "Ask anything you want...",
    inputPlaceholderFloating: "Ask Kapruka Agent...",
    categories: [
      { original: "gifts for her", label: "🎁 Gifts for Her" },
      { original: "Flowers", label: "💐 Send Flowers" },
      { original: "Cakes", label: "🎂 Order Cakes" },
      { original: "Chocolates", label: "🍫 Buy Chocolates" },
      { original: "categories", label: "🛍️ Browse Categories" },
      { original: "track my order", label: "📦 Track My Order", query: "Can I track my order" },
      { original: "Check Delivery", label: "🚚 Check Delivery" }
    ],
    cartAdded: (name) => `Added ${name} to your basket! 🛒`,
    orderCreated: "Your order has been created successfully! 🎉",
    paymentSuccessMsg: "Thank you for confirming! I have cleared your cart for you. You can track your order status anytime by pasting the **Order Number** sent to your email into this chat.",
    apiErrorMsg: (err) => `Aiyo! ⚠️ I had trouble connecting to the backend server. Please try again later. (${err})`
  },
  "Sinhala (Unicode)": {
    landingGreeting: <>ආයුබෝවන්, මම <span style={{ color: "#5322B8" }}>KIKO</span>.<br />බඩු ගන්න උදව් කරන්නද?</>,
    inputPlaceholderEmpty: "ඔබට අවශ්‍ය ඕනෑම දෙයක් අසන්න...",
    inputPlaceholderFloating: "කපෘක නියෝජිතයාගෙන් අසන්න...",
    categories: [
      { original: "gifts for her", label: "🎁 ඇයට තෑගි" },
      { original: "Flowers", label: "💐 මල් යවන්න" },
      { original: "Cakes", label: "🎂 කේක් ඇණවුම් කරන්න" },
      { original: "Chocolates", label: "🍫 චොකලට් මිලදී ගන්න" },
      { original: "categories", label: "🛍️ කාණ්ඩ පිරික්සන්න" },
      { original: "track my order", label: "📦 මගේ ඇණවුම නිරීක්ෂණය කරන්න", query: "Can I track my order" },
      { original: "Check Delivery", label: "🚚 බෙදාහැරීම් පරීක්ෂාව" }
    ],
    cartAdded: (name) => `${name} ඔබේ කූඩයට එකතු කරන ලදී! 🛒`,
    orderCreated: "ඔබගේ ඇණවුම සාර්ථකව නිර්මාණය කරන ලදී! 🎉",
    paymentSuccessMsg: "තහවුරු කිරීම ගැන ස්තුතියි! මම ඔබගේ කූඩය හිස් කළා. ඔබගේ විද්‍යුත් තැපෑලට එවා ඇති **ඇණවුම් අංකය** මෙම චැට් එකට ඇතුලත් කිරීමෙන් ඕනෑම වේලාවක ඇණවුම් තත්ත්වය නිරීක්ෂණය කළ හැක.",
    apiErrorMsg: (err) => `අයියෝ! ⚠️ පසුපස සේවාදායකයට සම්බන්ධ වීමට නොහැකි විය. පසුව නැවත උත්සාහ කරන්න. (${err})`
  },
  "Singlish": {
    landingGreeting: <>Ayubowan, mama <span style={{ color: "#5322B8" }}>KIKO</span>.<br />Oyata badu ganna udaw karannada?</>,
    inputPlaceholderEmpty: "Oyata one deyak ahanna...",
    inputPlaceholderFloating: "Kapruka Agent gen ahanna...",
    categories: [
      { original: "gifts for her", label: "🎁 Eyata Thegi" },
      { original: "Flowers", label: "💐 Mal Yawanna" },
      { original: "Cakes", label: "🎂 Cakes Order Karanna" },
      { original: "Chocolates", label: "🍫 Chocolates Ganna" },
      { original: "categories", label: "🛍️ Categories Balanna" },
      { original: "track my order", label: "📦 Mage Order Eka Track Karanna", query: "Can I track my order" },
      { original: "Check Delivery", label: "🚚 Delivery Check Karanna" }
    ],
    cartAdded: (name) => `${name} oyage cart ekata add kala! 🛒`,
    orderCreated: "Oyage order eka successfully create kala! 🎉",
    paymentSuccessMsg: "Confirm kalata sthuthi! Mama oyage basket eka clear kala. Oyage email ekata apu **Order Number** eka methanata daala order status eka track karanna puluwan.",
    apiErrorMsg: (err) => `Aiyo! ⚠️ Backend server ekata connect wenna bari una. Passe try karanna. (${err})`
  },
  "Tamil (Unicode)": {
    landingGreeting: <>வணக்கம், நான் <span style={{ color: "#5322B8" }}>KIKO</span>.<br />உங்களுக்கு உதவட்டுமா?</>,
    inputPlaceholderEmpty: "உங்களுக்கு தேவையானதை கேளுங்கள்...",
    inputPlaceholderFloating: "கப்ருகா முகவரிடம் கேளுங்கள்...",
    categories: [
      { original: "gifts for her", label: "🎁 அவளுக்கான பரிசுகள்" },
      { original: "Flowers", label: "💐 பூக்களை அனுப்புங்கள்" },
      { original: "Cakes", label: "🎂 கேக்குகளை ஆர்டர் செய்யுங்கள்" },
      { original: "Chocolates", label: "🍫 சாக்லேட்டுகளை வாங்குங்கள்" },
      { original: "categories", label: "🛍️ வகைகளை உலாவுக" },
      { original: "track my order", label: "📦 எனது ஆர்டரை கண்காணிக்கவும்", query: "Can I track my order" },
      { original: "Check Delivery", label: "🚚 டெலிவரி சரிபார்க்கவும்" }
    ],
    cartAdded: (name) => `${name} உங்கள் கூடையில் சேர்க்கப்பட்டது! 🛒`,
    orderCreated: "உங்கள் ஆர்டர் வெற்றிகரமாக உருவாக்கப்பட்டது! 🎉",
    paymentSuccessMsg: "உறுதிப்படுத்தியதற்கு நன்றி! உங்கள் கூடையை நான் காலியாக்கிவிட்டேன். உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்ட **ஆர்டர் எண்ணை** இங்கு பதிவிடுவதன் மூலம் உங்கள் ஆர்டரின் நிலையை எப்போது வேண்டுமானாலும் கண்காணிக்கலாம்.",
    apiErrorMsg: (err) => `அய்யோ! ⚠️ சர்வரை இணைப்பதில் சிக்கல் ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும். (${err})`
  },
  "Tanglish": {
    landingGreeting: <>Vanakkam, naan <span style={{ color: "#5322B8" }}>KIKO</span>.<br />Ungaluku help pannava?</>,
    inputPlaceholderEmpty: "Ungaluku vena de kelunga...",
    inputPlaceholderFloating: "Kapruka Agent kitta kelunga...",
    categories: [
      { original: "gifts for her", label: "🎁 Avalukkana Parisugal" },
      { original: "Flowers", label: "💐 Pookkal Anuppunga" },
      { original: "Cakes", label: "🎂 Cakes Order Pannunga" },
      { original: "Chocolates", label: "🍫 Chocolates Vaangunga" },
      { original: "categories", label: "🛍️ Categories Paarunga" },
      { original: "track my order", label: "📦 En Order Ah Track Pannunga", query: "Can I track my order" },
      { original: "Check Delivery", label: "🚚 Delivery Check Pannunga" }
    ],
    cartAdded: (name) => `${name} unga basket la add panniyachu! 🛒`,
    orderCreated: "Unga order successfully create panniyachu! 🎉",
    paymentSuccessMsg: "Confirm pannathuku nandri! Basket clear panniyachu. Ungaluku vantha **Order Number** ah inga paste panni eppa vena track pannikalam.",
    apiErrorMsg: (err) => `Aiyo! ⚠️ Backend server connect aagala. Aprama try pannunga. (${err})`
  }
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
  const [loadMoreCounts, setLoadMoreCounts] = useState<Record<number, number>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [language, setLanguage] = useState("English");
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [selectedLangTemp, setSelectedLangTemp] = useState("English");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [dismissedSaveAddress, setDismissedSaveAddress] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const initialTextRef = useRef("");

  // Auto-scroll on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("kapruka_cart");
    if (savedCart) { try { setCartItems(JSON.parse(savedCart)); } catch (e) { } }
    const savedMessages = localStorage.getItem("kapruka_messages_v3");
    if (savedMessages) { try { setMessages(JSON.parse(savedMessages)); } catch (e) { } }
    const savedLanguage = localStorage.getItem("kapruka_language");
    if (savedLanguage) {
      let resolvedLang = savedLanguage;
      if (savedLanguage === "Sinhala") resolvedLang = "Sinhala (Unicode)";
      else if (savedLanguage === "Tamil") resolvedLang = "Tamil (Unicode)";

      setLanguage(resolvedLang);
      setSelectedLangTemp(resolvedLang);
    }
    const hasSeenPopups = localStorage.getItem("kapruka_has_seen_popups");
    if (!hasSeenPopups) {
      setShowLanguageModal(true);
    }
  }, []);

  useEffect(() => { localStorage.setItem("kapruka_cart", JSON.stringify(cartItems)); }, [cartItems]);
  useEffect(() => { localStorage.setItem("kapruka_messages_v3", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem("kapruka_language", language); }, [language]);

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
    if (language.includes("Sinhala") || language === "Singlish") {
      recognition.lang = "si-LK";
    } else if (language.includes("Tamil") || language === "Tanglish") {
      recognition.lang = "ta-LK";
    } else {
      recognition.lang = "en-US";
    }
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
      silenceTimeoutRef.current = setTimeout(() => recognition.stop(), 2000);
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

    const t = LOCALIZATION[language] || LOCALIZATION["English"];
    const structured: AgentResponse = {
      type: "cart_update",
      message: t.cartAdded(item.name),
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
        const t = LOCALIZATION[language] || LOCALIZATION["English"];
        const structured: AgentResponse = {
          type: "order_created",
          message: t.orderCreated,
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
        } catch (e) { }
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
    const t = LOCALIZATION[language] || LOCALIZATION["English"];
    const structured: AgentResponse = {
      type: "text",
      message: t.paymentSuccessMsg
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please select an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMessage = async (text: string, options?: { hidden?: boolean }) => {
    if (!text.trim() && !attachedImage) return;

    let finalContent = text.trim();
    if (!finalContent && attachedImage) {
      finalContent = "Please find items similar to this image.";
    }

    const userMsg: Message = { role: "user", content: finalContent, hidden: options?.hidden, image_base64: attachedImage || undefined };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setAttachedImage(null);
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
            name: m.name,
            image_base64: m.image_base64
          })),
          user_email: null,
          cart: cartItems,
          language: language
        })
      });

      if (!response.ok) throw new Error("Server responded with error status: " + response.status);

      const data = await response.json();
      if (data.language) setLanguage(data.language);
      const structured: AgentResponse | null = data.structured_response || null;

      if (data.history && data.history.length > 0) {
        // Attach the structured_response to the last assistant message
        // and carefully preserve 'hidden' and 'structured_response' from the old messages!
        const history: Message[] = data.history.map((m: any, idx: number, arr: any[]) => {
          // Look up matching message in the frontend's previous state
          // to carry over frontend-only fields that the backend doesn't track.
          const oldMsg = updatedMessages.find(old => old.role === m.role && old.content === m.content);

          const merged = { ...m };
          if (oldMsg) {
            if (oldMsg.hidden !== undefined) merged.hidden = oldMsg.hidden;
            if (oldMsg.structured_response !== undefined) merged.structured_response = oldMsg.structured_response;
          }

          // The backend sends the latest parsed structured_response separately
          if (merged.role === "assistant" && idx === arr.length - 1 && structured) {
            merged.structured_response = structured;
          }
          return merged;
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
      const t = LOCALIZATION[language] || LOCALIZATION["English"];
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: JSON.stringify({ type: "text", message: t.apiErrorMsg(error.message) }),
          structured_response: { type: "text", message: t.apiErrorMsg(error.message) }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async (msgIndex: number) => {
    const currentCount = loadMoreCounts[msgIndex] || 0;
    if (currentCount >= 3) return;

    setLoadingMoreIds(prev => ({ ...prev, [msgIndex]: true }));
    try {
      const historyUpToMessage = messages.slice(0, msgIndex + 1).map(m => ({
        role: m.role, content: m.content, tool_calls: m.tool_calls, name: m.name, tool_call_id: m.tool_call_id
      }));
      const existingMsg = messages[msgIndex];
      const existingItems = (existingMsg.structured_response as any)?.items || [];
      const amountToRequest = existingItems.length + 10;

      // Find the last actual user request
      let lastUserReq = "this category";
      for (let i = historyUpToMessage.length - 1; i >= 0; i--) {
        if (historyUpToMessage[i].role === "user") {
          lastUserReq = historyUpToMessage[i].content;
          break;
        }
      }

      historyUpToMessage.push({ role: "user", content: `Please provide up to ${amountToRequest} products for: "${lastUserReq}"`, tool_calls: undefined, name: undefined, tool_call_id: undefined });

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL as string;
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyUpToMessage, user_email: null, language: language })
      });

      if (!response.ok) throw new Error("Server error: " + response.status);
      const data = await response.json();
      if (data.language) setLanguage(data.language);
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
      setLoadMoreCounts(prev => ({ ...prev, [msgIndex]: (prev[msgIndex] || 0) + 1 }));
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
            onLoadMore={(loadMoreCounts[msgIndex] || 0) < 3 ? () => handleLoadMore(msgIndex) : undefined}
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

      case "read_cart":
        return (
          <ReadCart
            message={sr.message}
            items={sr.items}
            total={sr.total}
            onViewCart={() => setIsCartOpen(true)}
          />
        );

      case "checkout_form":
        return (
          <CheckoutForm
            message={sr.message}
            initialData={{
              recipientName: sr.recipient_name || "",
              phone: sr.phone || "",
              address: sr.address || "",
              city: sr.city || "",
              date: sr.date || "",
              senderName: sr.sender_name || "",
              giftMessage: sr.gift_message || "",
            }}
            onSubmit={(details) => handleSendMessage(
              `Here are my checkout details:\nRecipient: ${details.recipientName} (${details.phone})\nDelivery Address: ${details.address}, ${details.city}\nDate: ${details.date}\nSender: ${details.senderName}\nGift Message: ${details.giftMessage || "None"}`,
              { hidden: true }
            )}
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

      case "order_created": {
        const isLatest = msgIndex === messages.length - 1;
        // Find the most recent order_summary before this message
        const previousSummary = messages.slice(0, msgIndex).reverse().find((m: any) => m.structured_response?.type === "order_summary")?.structured_response as any;
        const deliveryDetails = previousSummary?.delivery;
        const recipientDetails = previousSummary?.recipient;
        const hasSaved = typeof window !== "undefined" && localStorage.getItem("kapruka_saved_address");
        const showSave = isLatest && deliveryDetails && !hasSaved && !dismissedSaveAddress;

        return (
          <OrderCreated
            message={sr.message}
            checkout_url={sr.checkout_url}
            order_ref={sr.order_ref}
            expires_at={sr.expires_at}
            totals={sr.totals}
            onProceed={(url) => setPaymentUrl(url)}
            showSavePrompt={!!showSave}
            onSaveAddress={() => {
              const fullDetails = { delivery: deliveryDetails, recipient: recipientDetails };
              localStorage.setItem("kapruka_saved_address", JSON.stringify(fullDetails));
              setDismissedSaveAddress(true);
            }}
            onDismissSaveAddress={() => setDismissedSaveAddress(true)}
          />
        );
      }

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
            className="glass-panel agent-card-glow"
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

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Top Branded Header */}
      <header className="top-header">
        <div className="header-logos-wrapper">
          <a href="https://www.kapruka.com" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center" }}>
            <img
              src="/kapruka-logo.webp"
              alt="Kapruka"
              className="header-kapruka-logo"
            />
          </a>
          <div className="header-separator"></div>
          <div className="header-kiko-wrapper">
            <img
              src="/chatbot-logo.png"
              alt="KIKO"
              className="header-kiko-logo"
            />
            <span className="hide-on-mobile" style={{ fontSize: "1.1rem", fontWeight: 800, color: "#2D2375", letterSpacing: "0.5px" }}>KIKO</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={resetChat}
            className="header-action-btn"
            style={{ background: "#5322B8", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
            aria-label="Reset Chat"
          >
            <RotateCcw strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setIsCartOpen(true)}
            className="header-action-btn"
            style={{ position: "relative", background: "#5322B8", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
            aria-label="Cart"
          >
            {cartItems.length > 0 && (
              <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "linear-gradient(to bottom right, #facc15, #eab308)", color: "#fff", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: "0.75rem", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
            <ShoppingCart strokeWidth={1.5} />
          </button>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="header-action-btn"
              style={{ background: "#5322B8", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
              aria-label="Settings"
            >
              <Settings strokeWidth={1.5} />
            </button>
            {isSettingsOpen && (
              <>
                <div
                  onClick={() => setIsSettingsOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 200 }}
                />
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: "12px",
                  width: "280px", background: "#ffffff", borderRadius: "16px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 201, padding: "16px",
                  border: "1px solid #e2e8f0"
                }}>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#0f172a", fontWeight: 700 }}>Settings</h3>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "8px", fontWeight: 600 }}>Language</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {[
                        { id: "English", label: "English" },
                        { id: "Sinhala (Unicode)", label: "සිංහල (Sinhala Unicode)" },
                        { id: "Singlish", label: "Singlish (Romanized Sinhala)" },
                        { id: "Tamil (Unicode)", label: "தமிழ் (Tamil Unicode)" },
                        { id: "Tanglish", label: "Tanglish (Romanized Tamil)" }
                      ].map(lang => (
                        <button
                          key={lang.id}
                          onClick={() => { setLanguage(lang.id); setIsSettingsOpen(false); }}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid",
                            textAlign: "left",
                            background: language === lang.id ? "#f3e8ff" : "#ffffff",
                            borderColor: language === lang.id ? "#9333ea" : "#e2e8f0",
                            color: language === lang.id ? "#7e22ce" : "#475569",
                            fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                          }}
                        >
                          <span>{lang.label}</span>
                          {language === lang.id && <span style={{ color: "#9333ea" }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "8px", fontWeight: 600 }}>About KIKO</label>
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
                      KIKO is your AI-powered Kapruka shopping assistant. It helps you discover products, track orders, and complete checkouts effortlessly.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
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
          style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", maxWidth: "90vw", zIndex: 200,
            transform: isCartOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.3s ease",
            display: "flex", flexDirection: "column",
            background: "#ffffff",
            boxShadow: "-4px 0 15px rgba(0,0,0,0.05)"
          }}
        >
          {/* Header */}
          <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: "#0f172a", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Cart</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "100px", padding: "4px 12px", fontSize: "0.85rem", color: "#475569", fontWeight: 500 }}>
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)} Items
              </div>
              <button onClick={() => setIsCartOpen(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="15" y1="3" x2="15" y2="21" /><path d="M8 8l4 4-4 4" /></svg>
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#ffffff" }}>
            {isCartLoading ? (
              <div style={{ color: "#64748b", textAlign: "center" }}>Loading cart...</div>
            ) : cartItems.length === 0 ? (
              <div style={{ color: "#64748b", textAlign: "center" }}>Your cart is empty.</div>
            ) : (
              cartItems.map(item => (
                <div key={item.product_id} style={{ display: "flex", gap: "16px", border: "1px solid #e2e8f0", padding: "16px", borderRadius: "16px", alignItems: "flex-start" }}>
                  {(item.image_url || item.image) ? <img src={item.image_url || item.image} alt={item.product_name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "12px" }} /> : <div style={{ width: 80, height: 80, background: "#f1f5f9", borderRadius: "12px" }} />}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ color: "#312e81", fontSize: "1rem", fontWeight: 500, lineHeight: 1.3 }}>{item.product_name}</div>
                    <div style={{ color: "#0f172a", fontSize: "1rem", fontWeight: 700 }}>
                      {item.price ? `LKR ${(item.price * item.quantity).toLocaleString()}` : "N/A"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "100px", padding: "4px 8px" }}>
                        <button onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)} style={{ background: "transparent", color: "#64748b", border: "none", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem" }}>-</button>
                        <span style={{ color: "#0f172a", fontSize: "0.95rem", minWidth: "28px", textAlign: "center", fontWeight: 600 }}>{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)} style={{ background: "transparent", color: "#64748b", border: "none", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem" }}>+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.product_id)} style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Remove item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ color: "#64748b", fontSize: "1.1rem" }}>Total</span>
              <span style={{ color: "#0f172a", fontSize: "1.3rem", fontWeight: 700 }}>LKR {cartItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0).toLocaleString()}</span>
            </div>
            <button
              onClick={handleCartCheckout}
              disabled={cartItems.length === 0}
              style={{ width: "100%", background: "#3b2073", color: "#ffffff", border: "none", padding: "16px", borderRadius: "12px", fontWeight: 600, fontSize: "1.1rem", cursor: cartItems.length === 0 ? "not-allowed" : "pointer", opacity: cartItems.length === 0 ? 0.5 : 1, transition: "background 0.2s" }}
            >
              Checkout
            </button>
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                onClick={() => setCartItems([])}
                style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.95rem", cursor: "pointer", textDecoration: "none" }}
              >
                Clear cart
              </button>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <section className={`glass-card chat-section ${messages.length === 0 ? "empty" : ""}`} style={{ background: "transparent" }}>

          {messages.length === 0 ? (
            // ── KIKO UI Empty State ──
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "20px", paddingBottom: "15vh", position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
                <div className="float-rotate-animation">
                  <img
                    src="/chatbot-logo.png"
                    alt="Kapruka AI Chatbot"
                    className="home-logo"
                    style={{ objectFit: "contain" }}
                  />
                </div>
              </div>

              <div style={{ textAlign: "center", maxWidth: "800px", marginBottom: "32px" }}>
                <h1 className="home-title" style={{ fontWeight: 700, lineHeight: 1.2, color: "#2D2375" }}>
                  {(LOCALIZATION[language] || LOCALIZATION["English"]).landingGreeting}
                </h1>
              </div>

              <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto 24px auto" }}>
                {attachedImage && (
                  <div style={{ position: "relative", display: "inline-block", marginBottom: "8px", pointerEvents: "auto" }}>
                    <img src={attachedImage} alt="Attached preview" style={{ height: "60px", borderRadius: "8px", border: "2px solid #5322B8", objectFit: "cover", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                    <button onClick={() => setAttachedImage(null)} style={{ position: "absolute", top: "-8px", right: "-8px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold" }}>×</button>
                  </div>
                )}
                <div className="search-glow home-input-container" style={{ background: "#fff", borderRadius: "999px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <img src="/chatbot-logo.png" alt="Kiko" style={{ width: "24px", height: "24px", flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder={(LOCALIZATION[language] || LOCALIZATION["English"]).inputPlaceholderEmpty}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#374151", fontSize: "1rem", outline: "none" }}
                  />
                  <button
                    id="send-msg-btn"
                    onClick={() => (inputText.trim() || attachedImage) ? handleSendMessage(inputText) : toggleListening()}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}
                  >
                    {(inputText.trim() || attachedImage) ? (
                      <Send size={20} />
                    ) : (
                      <Mic size={20} color={isListening ? "#ef4444" : "currentColor"} />
                    )}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
                    <Paperclip size={20} />
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
                {(LOCALIZATION[language] || LOCALIZATION["English"]).categories.map((cat) => (
                  <button
                    key={cat.original}
                    onClick={() => handleSendMessage(cat.query || `Show me ${cat.original}`)}
                    style={{ background: "#5322B8", color: "#fff", border: "none", borderRadius: "999px", padding: "6px 18px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div style={{ position: "absolute", bottom: "8px", left: 0, right: 0, textAlign: "center", fontSize: "0.8rem", color: "#6b7280", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <span>Built by <a href="https://www.jayashan.online/" target="_blank" rel="noopener noreferrer" style={{ color: "#5322B8", fontWeight: "bold", textDecoration: "none" }}>Jayashan Manodya</a> • Powered by <span style={{ color: "#5322B8", fontWeight: "bold" }}>Kapruka MCP</span></span>
                <div style={{ position: "absolute", right: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.7rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.5px", color: "#8b8aad" }}>System Status</span>
                  <div className="status-dot" style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: process.env.NEXT_PUBLIC_ACTIVE_ENV === 'true' ? "#22c55e" : "#ef4444",
                    boxShadow: process.env.NEXT_PUBLIC_ACTIVE_ENV === 'true' ? "0 0 8px #22c55e" : "0 0 8px #ef4444",
                    animation: "blink 1.5s infinite"
                  }}></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Feed */}
              <div className="chat-feed-area" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "20px" }}>

                  {messages.map((msg, index) => {
                    if (msg.hidden || msg.role === "system") return null;
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
                        <div key={index} className="animate-fade-in" style={{ alignSelf: "flex-end", maxWidth: "100%", display: "flex", flexDirection: "row", alignItems: "flex-end", gap: "10px", width: "100%", justifyContent: "flex-end" }}>
                          <div className="user-msg-bubble" style={{ background: "var(--brand-purple-light)", borderRadius: "16px 16px 4px 16px", color: "#fff", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere", border: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                            {msg.image_base64 && (
                              <img src={msg.image_base64} alt="User attached" style={{ maxWidth: "100%", borderRadius: "8px", maxHeight: "200px", objectFit: "contain" }} />
                            )}
                            {renderFormattedText(msg.content)}
                          </div>
                          <img src="/user-icon.png" alt="User" className="avatar-icon" style={{ objectFit: "contain", flexShrink: 0 }} />
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
                      <div key={index} className="animate-fade-in ai-msg-container" style={{ alignSelf: "flex-start", maxWidth: "100%", display: "flex", flexDirection: "row", alignItems: "flex-end", width: "100%" }}>
                        <img src="/chatbot-logo.png" alt="KIKO" className="avatar-icon" style={{ objectFit: "contain", flexShrink: 0 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 }}>
                          {renderStructuredResponse(sr, index)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isLoading && (
                    <div style={{ alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "4px" }}>KIKO</span>
                      <div className="glass-panel agent-card-glow" style={{ padding: "14px 20px", borderRadius: "16px 16px 16px 4px", display: "flex", gap: "6px", alignItems: "center" }}>
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
              <div className="floating-input-wrapper" style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "transparent",
                pointerEvents: "none",
                zIndex: 10
              }}>
                {attachedImage && (
                  <div style={{ position: "relative", marginBottom: "8px", pointerEvents: "auto", alignSelf: "center" }}>
                    <img src={attachedImage} alt="Attached preview" style={{ height: "60px", borderRadius: "8px", border: "2px solid #5322B8", objectFit: "cover", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                    <button onClick={() => setAttachedImage(null)} style={{ position: "absolute", top: "-8px", right: "-8px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold" }}>×</button>
                  </div>
                )}
                <div className="floating-input-inner" style={{
                  display: "flex",
                  gap: "12px",
                  position: "relative",
                  alignItems: "center",
                  background: "#fff",
                  borderRadius: "30px",
                  width: "100%",
                  maxWidth: "800px",
                  border: "1px solid #d1d5db",
                  pointerEvents: "auto"
                }}>
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666", padding: "8px", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                  </button>
                  <input
                    type="text"
                    className="input-text-field"
                    placeholder={(LOCALIZATION[language] || LOCALIZATION["English"]).inputPlaceholderFloating}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#333", outline: "none", height: "40px" }}
                  />
                  <button
                    onClick={() => (inputText.trim() || attachedImage) ? handleSendMessage(inputText) : toggleListening()}
                    disabled={isLoading}
                    className={`glow-button ${isListening ? "listening" : ""}`}
                    style={{ background: isListening ? "#ef4444" : "var(--brand-purple-dark)", color: "#fff", border: "none", borderRadius: "50%", width: "44px", height: "44px", padding: 0, cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}
                    id="send-msg-btn"
                  >
                    {isListening ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (inputText.trim() || attachedImage) ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                    )}
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

      {/* Language selection modal */}
      {showLanguageModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", position: "relative" }}>

            {/* Header section */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#6b21a8", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
              LANGUAGE
            </div>

            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", textAlign: "center" }}>
              <span style={{ backgroundColor: "#fef08a", padding: "2px 10px", borderRadius: "6px" }}>Choose your language</span>
            </h2>

            <p style={{ color: "#475569", fontSize: "0.95rem", textAlign: "center", lineHeight: 1.5, margin: "0 0 24px 0", padding: "0 10px" }}>
              Pick how you want Kapruka Agent and the app to speak with you. You can change this anytime from Saved info.
            </p>

            {/* Stack of options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {[
                { id: "English", title: "English", subtitle: "English" },
                { id: "Sinhala (Unicode)", title: "සිංහල", subtitle: "Sinhala" },
                { id: "Tamil (Unicode)", title: "தமிழ்", subtitle: "Tamil" }
              ].map(option => {
                const isSelected = selectedLangTemp === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedLangTemp(option.id)}
                    style={{
                      width: "100%",
                      padding: "16px 20px",
                      borderRadius: "16px",
                      border: isSelected ? "2px solid #581c87" : "1px solid #e2e8f0",
                      background: isSelected ? "#f3e8ff" : "#ffffff",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      outline: "none"
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: isSelected ? "#581c87" : "#0f172a" }}>
                      {option.title}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: isSelected ? "#7e22ce" : "#64748b" }}>
                      {option.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action button */}
            <button
              onClick={() => {
                setLanguage(selectedLangTemp);
                setShowLanguageModal(false);
                setShowFeaturesModal(true);
              }}
              style={{
                width: "100%",
                background: "#4c1d95",
                color: "#ffffff",
                border: "none",
                padding: "14px",
                borderRadius: "9999px",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#5b21b6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#4c1d95")}
            >
              Continue
            </button>

          </div>
        </div>
      )}

      {/* KIKO features modal */}
      {showFeaturesModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", position: "relative" }}>

            {/* Header section */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#6b21a8", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              FEATURES
            </div>

            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", textAlign: "center" }}>
              <span style={{ backgroundColor: "#fef08a", padding: "2px 10px", borderRadius: "6px" }}>Meet KIKO!</span>
            </h2>

            <p style={{ color: "#475569", fontSize: "0.95rem", textAlign: "center", lineHeight: 1.5, margin: "0 0 24px 0" }}>
              Your personal AI shopping assistant for Kapruka. Here is what I can help you do:
            </p>

            {/* List of features */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
              {[
                { icon: "🔍", title: "Browse & Search", desc: "Browse, search and recommendation for you." },
                { icon: "🛒", title: "Manage Basket", desc: "Add, remove & view items." },
                { icon: "🚚", title: "Check Delivery", desc: "Verify cities & delivery fees." },
                { icon: "💳", title: "Secure Checkout", desc: "Place orders directly in LKR." },
                { icon: "📦", title: "Order Tracking", desc: "Track shipment in real-time." },
                { icon: "🎙️", title: "Talk Live with Agent", desc: "Tap mic and speak — Agent replies out loud." }
              ].map((f, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid #f1f5f9",
                  background: "#f8fafc",
                  gridColumn: "span 1"
                }}>
                  <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{f.icon}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>{f.title}</strong>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.3 }}>{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action button */}
            <button
              onClick={() => {
                setShowFeaturesModal(false);
                localStorage.setItem("kapruka_has_seen_popups", "true");
              }}
              style={{
                width: "100%",
                background: "#4c1d95",
                color: "#ffffff",
                border: "none",
                padding: "14px",
                borderRadius: "9999px",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#5b21b6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#4c1d95")}
            >
              Let's Shop!
            </button>

          </div>
        </div>
      )}

      {/* Post Payment Dialog */}
      {showPostPaymentDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", textAlign: "center" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#6b21a8", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "12px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              Payment Confirmation
            </div>

            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0" }}>
              Did you complete the payment?
            </h2>

            <p style={{ color: "#475569", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 24px 0" }}>
              Please let us know if your checkout payment was successful so we can clear your basket and update your status.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handlePaymentPending}
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  padding: "14px",
                  borderRadius: "9999px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              >
                No, Not Yet
              </button>
              <button
                onClick={handlePaymentSuccess}
                style={{
                  flex: 1,
                  background: "#4c1d95",
                  color: "#ffffff",
                  border: "none",
                  padding: "14px",
                  borderRadius: "9999px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#5b21b6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#4c1d95")}
              >
                Yes, I Paid!
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
