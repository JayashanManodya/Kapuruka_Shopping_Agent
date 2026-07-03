"use client";
import React from "react";

interface CategoryChild { name: string; url: string; }
interface Category { name: string; url: string; children: CategoryChild[]; }

interface Props {
  message: React.ReactNode | string;
  categories: Category[];
  onSelect: (name: string) => void;
}

export default function ListCategories({ message, categories, onSelect }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="glass-panel" style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "16px 16px 16px 4px", color: "#333", fontSize: "0.95rem", lineHeight: 1.5, border: "1px solid var(--glass-border)", maxWidth: "88%" }}>
        {message}
      </div>

      <div className="animate-fade-in" style={{ display: "flex", flexWrap: "wrap", gap: "10px", maxWidth: "600px" }}>
        {categories.map((cat, i) => (
          <div key={i} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px", minWidth: "140px", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => onSelect(cat.name)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand-purple)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(76,29,149,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)"; }}
          >
            <div style={{ fontWeight: 700, color: "#4c1d95", fontSize: "0.9rem", marginBottom: cat.children?.length ? "8px" : "0" }}>{cat.name}</div>
            {cat.children && cat.children.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {cat.children.slice(0, 3).map((child, j) => (
                  <div key={j} style={{ fontSize: "0.78rem", color: "#6b7280", cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); onSelect(child.name); }}
                  >
                    - {child.name}
                  </div>
                ))}
                {cat.children.length > 3 && (
                  <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>+{cat.children.length - 3} more</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
