"use client";
import React from "react";

interface RecommendedItem {
  id: string;
  name: string;
  summary: string;
  image_url: string;
  category: string;
  price: number;
  stock: string;
  url: string;
}

interface Props {
  message: React.ReactNode | string;
  items: RecommendedItem[];
  onAddToCart: (item: RecommendedItem) => void;
  onViewDetails: (item: RecommendedItem) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  carouselId: string;
}



export default function RecommendedItems({ message, items, onAddToCart, onViewDetails, onLoadMore, isLoadingMore, carouselId }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ width: "100%" }}>
      {/* Intro message bubble */}
      <div
        className="glass-panel agent-card-glow"
        style={{
          background: "#ffffff",
          padding: "14px 18px",
          borderRadius: "16px 16px 16px 4px",
          color: "#333",
          fontSize: "0.95rem",
          lineHeight: 1.5,
          border: "1px solid var(--glass-border)",
          marginBottom: "16px",
          maxWidth: "88%",
        }}
      >
        {message}
      </div>

      {/* Carousel header */}
      <div style={{
        width: "100vw", position: "relative", left: "50%", right: "50%",
        marginLeft: "-50vw", marginRight: "-50vw"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "16px",
          paddingLeft: "max(70px, calc(50vw - 400px + 46px))",
          paddingRight: "max(24px, calc(50vw - 400px + 24px))"
        }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
            {items.length} PRODUCTS
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "6px" }}>
              Shift + scroll
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => document.getElementById(carouselId)?.scrollBy({ left: -260, behavior: "smooth" })} className="scroll-arrow-btn" style={{ position: "relative", top: "auto", transform: "none", width: "32px", height: "32px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button onClick={() => document.getElementById(carouselId)?.scrollBy({ left: 260, behavior: "smooth" })} className="scroll-arrow-btn" style={{ position: "relative", top: "auto", transform: "none", width: "32px", height: "32px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable cards */}
        <div
          id={carouselId}
          className="product-carousel"
          style={{
            paddingLeft: "max(70px, calc(50vw - 400px + 46px))",
            paddingRight: "max(24px, calc(50vw - 400px + 24px))",
            boxSizing: "border-box"
          }}
        >
          {items.map((item) => {
            return (
              <div key={item.id} className="product-card-light animate-fade-in">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    style={{ width: "100%", height: "160px", objectFit: "contain", background: "#fff", marginBottom: "10px" }}
                  />
                )}
                {/* Product Name */}
                <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.95rem", marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.name}
                </div>
                {/* Summary */}
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.summary}
                </div>
                {/* Price row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ color: "#111827", fontWeight: 800, fontSize: "1.05rem" }}>
                    {item.price ? `${item.price.toLocaleString()} LKR` : "Price N/A"}
                  </span>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                  )}
                </div>
                {/* Stock badge removed */}
                {/* Actions */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    onClick={() => onViewDetails(item)}
                    style={{ flex: 1, background: "rgba(57, 32, 97, 0.08)", color: "var(--brand-purple)", border: "none", padding: "8px 16px", borderRadius: "20px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(57, 32, 97, 0.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(57, 32, 97, 0.08)"; }}
                  >
                    Details <span style={{ fontSize: "0.7rem", marginTop: "2px" }}>❯</span>
                  </button>
                  <button
                    onClick={() => onAddToCart(item)}
                    style={{ background: "var(--brand-yellow)", color: "var(--brand-purple-dark)", border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontWeight: 700, fontSize: "1.2rem", transition: "all 0.2s", boxShadow: "0 2px 6px rgba(255,210,0,0.3)" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                    title="Add to Cart"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load more */}
        {onLoadMore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              style={{ 
                background: "transparent", 
                border: "none", 
                color: "var(--brand-purple)", 
                fontWeight: 600, 
                fontSize: "0.85rem", 
                cursor: isLoadingMore ? "wait" : "pointer", 
                textDecoration: "underline", 
                opacity: isLoadingMore ? 0.7 : 1 
              }}
            >
              {isLoadingMore ? "Loading..." : "Load more products"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
