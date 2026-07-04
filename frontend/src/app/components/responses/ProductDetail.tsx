"use client";
import React, { useState } from "react";

interface ProductVariant { id: string; name: string; price: number; stock: string; }
interface ProductData {
  id: string; name: string; description: string; price: number;
  images: string[]; variants: ProductVariant[];
  attributes: Record<string, string>; stock: string; shipping: string; url: string;
}

interface Props {
  message: React.ReactNode | string;
  product: ProductData;
  onAddToCart: (product: ProductData) => void;
}

const stockBadge = (stock: string) => {
  if (stock === "low_stock") return { label: "Low Stock", bg: "#fef3c7", color: "#d97706" };
  if (stock === "out_of_stock") return { label: "Out of Stock", bg: "#fee2e2", color: "#dc2626" };
  return { label: "In Stock", bg: "#d1fae5", color: "#059669" };
};

export default function ProductDetail({ message, product, onAddToCart }: Props) {
  const [mainImage, setMainImage] = useState(product.images?.[0] || "");
  const badge = stockBadge(product.stock);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Intro bubble */}
      <div className="glass-panel agent-card-glow" style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "16px 16px 16px 4px", color: "#333", fontSize: "0.95rem", lineHeight: 1.5, border: "1px solid var(--glass-border)", maxWidth: "88%" }}>
        {message}
      </div>

      {/* Product card */}
      <div className="animate-fade-in agent-card-glow" style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", maxWidth: "420px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        {/* Main image */}
        {mainImage && (
          <div style={{ padding: "16px", background: "#f8f9fa", display: "flex", justifyContent: "center" }}>
            <img src={mainImage} alt={product.name} style={{ width: "100%", height: "auto", maxHeight: "250px", objectFit: "contain", borderRadius: "12px", background: "#fff", border: "1px solid #e5e7eb" }} />
          </div>
        )}

        {/* Thumbnails */}
        {product.images && product.images.length > 1 && (
          <div style={{ display: "flex", gap: "8px", padding: "0 16px", marginTop: "12px" }}>
            {product.images.slice(0, 4).map((img, idx) => (
              <div
                key={idx}
                onClick={() => setMainImage(img)}
                style={{ border: mainImage === img ? "2px solid #5b21b6" : "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", width: "48px", height: "48px", cursor: "pointer" }}
              >
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: "16px" }}>
          {/* Tags row */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
              {product.attributes?.type || "PRODUCT"}
            </span>
            <span style={{ fontSize: "0.7rem", color: badge.color, background: badge.bg, padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
              {badge.label}
            </span>
          </div>

          {/* Title + link */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#4c1d95", lineHeight: 1.3 }}>{product.name}</h2>
            {product.url && (
              <a href={product.url} target="_blank" rel="noreferrer" style={{ color: "#8b5cf6", marginTop: "2px", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            )}
          </div>

          {/* ID */}
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "16px", fontFamily: "monospace" }}>{product.id}</div>

          {/* Price */}
          <div style={{ color: "#111827", fontWeight: 800, fontSize: "1.25rem", marginBottom: "12px" }}>
            {product.price ? `LKR ${product.price.toLocaleString()}` : "Price N/A"}
          </div>

          {/* Description */}
          {product.description && (
            <div style={{ color: "#6b7280", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "20px" }}>
              {product.description.length > 250 ? product.description.substring(0, 250) + "..." : product.description}
            </div>
          )}

          {/* Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "8px" }}>DETAILS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {Object.entries(product.attributes).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", fontSize: "0.85rem" }}>
                    <div style={{ width: "100px", color: "#9ca3af", textTransform: "capitalize" }}>{k}</div>
                    <div style={{ color: "#374151" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping */}
          {product.shipping && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "20px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ color: "#4c1d95", marginTop: "2px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>Shipping</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {typeof product.shipping === "string" ? product.shipping : Object.entries(product.shipping).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(", ")}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={() => onAddToCart(product)}
              style={{ flex: 1, background: "#4c1d95", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              Add to Cart
            </button>
            {product.url && (
              <a href={product.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "#ffffff", color: "#4c1d95", border: "1px solid #e5e7eb", padding: "10px", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
                View on Kapruka <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
