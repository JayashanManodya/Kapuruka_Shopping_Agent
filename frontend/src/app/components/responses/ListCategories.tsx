"use client";
import React, { useState } from "react";

interface Props {
  message: React.ReactNode | string;
  onSelect: (name: string) => void;
  // keeping the interface for compatibility but not using categories prop
  categories?: any[];
}

const RAW_POPULAR = [
  "Chocolates", "cakes", "flowers", "Grocery", "Perfumes", 
  "Softtoy", "bestsellers", "birthday", "anniversary", "wedding", "valentine"
];

const RAW_ALL = [
  "Automobile", "Ayurvedic", "BabyItems", "Bicycle", "Books", "bridetobe", "Childrens", 
  "childrensday", "christmas", "Clothing", "combopack", "corporate", "Cosmetics", "Curd", 
  "diwali", "Electronic", "Fashion", "fathersday", "Food", "Fruits", "Giftcert", "Giftset", 
  "GreetingCards", "graduation", "halloween", "Health", "Homeware", "Household", "household", 
  "Jewellery", "Kids", "KidsToys", "Liquor", "lover", "Mobile", "mother", "momtobe", "newadditions", 
  "newyear_january", "Adult Products", "ornaments", "party", "Personalized Gifts", "Pet", "Pharmacy", 
  "pirikara", "promotions", "samedaydelivery", "Schoolpride", "Services", "Sports", "sympathies", 
  "teachersday", "thaipongle", "uniquegifts", "Vegetables", "womenday", "youandme"
];

function formatName(c: string) {
  const map: Record<string, string> = {
    "bridetobe": "Bride to Be",
    "childrensday": "Childrens Day",
    "fathersday": "Fathers Day",
    "newyear_january": "New Year",
    "samedaydelivery": "Same Day Delivery",
    "youandme": "You and Me",
    "momtobe": "Mom to Be",
    "teachersday": "Teachers Day",
    "womenday": "Womens Day",
    "BabyItems": "Baby Items",
    "KidsToys": "Kids Toys",
    "GreetingCards": "Greeting Cards",
    "combopack": "Combo Pack",
    "uniquegifts": "Unique Gifts",
    "newadditions": "New Additions",
    "thaipongle": "Thai Pongal"
  };
  if (map[c]) return map[c];
  return c.charAt(0).toUpperCase() + c.slice(1);
}

const POPULAR = Array.from(new Set(RAW_POPULAR.map(formatName))).sort();
const ALL_CATEGORIES = Array.from(new Set(RAW_ALL.map(formatName))).sort();

export default function ListCategories({ message, onSelect }: Props) {
  const [filter, setFilter] = useState("");

  const renderButton = (name: string, rawKey: string) => {
    return (
      <button
        key={name}
        onClick={() => onSelect(name)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          background: "rgba(0, 0, 0, 0.03)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: "16px",
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
          color: "#333"
        }}
        onMouseEnter={e => { 
          e.currentTarget.style.borderColor = "var(--brand-purple, #392061)"; 
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.06)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => { 
          e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.08)"; 
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.03)";
          e.currentTarget.style.transform = "none";
        }}
      >
        <span style={{ fontWeight: 500, fontSize: "0.9rem", textAlign: "left" }}>{name}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
    );
  };

  const filteredPopular = POPULAR.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
  const filteredAll = ALL_CATEGORIES.filter(c => c.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "560px" }}>
      {message && (
        <div className="glass-panel agent-card-glow" style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "16px 16px 16px 4px", color: "#333", fontSize: "0.95rem", lineHeight: 1.5, border: "1px solid var(--glass-border)", maxWidth: "88%" }}>
          {message}
        </div>
      )}

      <div className="animate-fade-in glass-panel agent-card-glow" style={{ 
        background: "#ffffff", 
        borderRadius: "16px 16px 16px 4px", 
        border: "1px solid var(--glass-border)", 
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", background: "#3b2667", borderBottom: "3px solid #facc15" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </div>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: "2px", letterSpacing: "0.5px" }}>Shop by Category</div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.7)" }}>{POPULAR.length + ALL_CATEGORIES.length} departments on Kapruka</div>
            </div>
          </div>
          
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Filter categories..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "10px 14px 10px 38px", 
                borderRadius: "12px", 
                border: "1px solid rgba(255, 255, 255, 0.2)", 
                background: "rgba(0, 0, 0, 0.2)",
                fontSize: "0.9rem", 
                color: "#ffffff", 
                outline: "none", 
                boxSizing: "border-box",
                transition: "border-color 0.2s"
              }} 
              onFocus={e => e.target.style.borderColor = "#facc15"}
              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.2)"}
            />
          </div>
        </div>

        {/* Scrollable Area */}
        <div style={{ padding: "20px", maxHeight: "380px", overflowY: "auto", background: "#ffffff" }}>
          
          {filteredPopular.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ 
                fontSize: "0.75rem", 
                fontWeight: 700, 
                color: "#3b2667", 
                letterSpacing: "1.5px", 
                textTransform: "uppercase", 
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Popular
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {filteredPopular.map(name => renderButton(name, RAW_POPULAR.find(r => formatName(r) === name) || name))}
              </div>
            </div>
          )}

          {filteredAll.length > 0 && (
            <div>
              <div style={{ 
                fontSize: "0.75rem", 
                fontWeight: 700, 
                color: "#6b7280", 
                letterSpacing: "1.5px", 
                textTransform: "uppercase", 
                marginBottom: "12px" 
              }}>
                All Categories
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {filteredAll.map(name => renderButton(name, RAW_ALL.find(r => formatName(r) === name) || name))}
              </div>
            </div>
          )}
          
          {filteredPopular.length === 0 && filteredAll.length === 0 && (
            <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
              <svg style={{ margin: "0 auto 12px auto", opacity: 0.5 }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              No categories found for "{filter}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
