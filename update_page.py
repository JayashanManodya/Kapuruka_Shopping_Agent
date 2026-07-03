import re

file_path = "frontend/src/app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update NormalizedProduct interface
interface_target = """interface NormalizedProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  inStock: boolean;
  url?: string;
  description: string;
}"""
interface_replacement = """interface NormalizedProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  inStock: boolean;
  url?: string;
  description: string;
  type?: string;
  subtype?: string;
  weight?: string | number;
  vendor?: string;
  variants?: any[];
  thumbnails?: string[];
  stock_level?: string;
}"""
content = content.replace(interface_target, interface_replacement)

# 2. Update getProductCache loop for "get_product"
get_product_target = """      } else if (msg.name === "get_product") {
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
        }"""
get_product_replacement = """      } else if (msg.name === "get_product") {
        const pId = parsed.id || parsed.product_id;
        if (pId) {
          cache[pId.toLowerCase()] = {
            id: pId,
            name: parsed.name || "Unknown Product",
            image: parsed.images?.[0] || parsed.image_url || "",
            price: parsed.price?.amount || 0,
            inStock: parsed.stock_level !== "out_of_stock" && parsed.in_stock !== false,
            url: parsed.url || "",
            description: parsed.description || "",
            type: parsed.type || "",
            subtype: parsed.subtype || "",
            weight: parsed.weight || 0,
            vendor: parsed.vendor || "Kapruka",
            variants: parsed.variants || [],
            thumbnails: parsed.images || [],
            stock_level: parsed.stock_level || ""
          };
        }"""
content = content.replace(get_product_target, get_product_replacement)

# 3. Replace Detailed layout for single product
layout_target = """                            // Detailed layout for single product
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
                                          {item.price ? ${item.price.toLocaleString()} LKR : "Price N/A"}
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
                            })()"""

layout_replacement = """                            // Detailed layout for single product
                            (() => {
                              const item = cache[extractedIds[0]];
                              return (
                                <div className="animate-fade-in" style={{ padding: "0", background: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", maxWidth: "420px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                  {/* Main Image */}
                                  {item.image && (
                                    <div style={{ padding: "16px", background: "#f8f9fa", display: "flex", justifyContent: "center" }}>
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        style={{ width: "100%", height: "auto", maxHeight: "250px", objectFit: "contain", borderRadius: "12px", background: "#fff", border: "1px solid #e5e7eb" }}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Thumbnails */}
                                  {item.thumbnails && item.thumbnails.length > 1 && (
                                    <div style={{ display: "flex", gap: "8px", padding: "0 16px", marginTop: "12px" }}>
                                      {item.thumbnails.slice(0, 4).map((thumb, idx) => (
                                        <div key={idx} style={{ border: idx === 0 ? "2px solid #5b21b6" : "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", width: "48px", height: "48px" }}>
                                          <img src={thumb} alt="thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div style={{ padding: "16px" }}>
                                    {/* Tags */}
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                                      <span style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
                                        {item.subtype || item.type || "PRODUCT"}
                                      </span>
                                      <span style={{ fontSize: "0.7rem", color: item.stock_level === "low_stock" ? "#d97706" : item.inStock ? "#059669" : "#dc2626", background: item.stock_level === "low_stock" ? "#fef3c7" : item.inStock ? "#d1fae5" : "#fee2e2", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                                        {item.stock_level === "low_stock" ? "Low stock" : item.inStock ? "In Stock" : "Out of Stock"}
                                      </span>
                                    </div>

                                    {/* Title */}
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
                                      <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#4c1d95", lineHeight: 1.3 }}>{item.name}</h2>
                                      {item.url && (
                                        <a href={item.url} target="_blank" rel="noreferrer" style={{ color: "#8b5cf6", marginTop: "2px", flexShrink: 0 }}>
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                        </a>
                                      )}
                                    </div>

                                    {/* ID */}
                                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "16px", fontFamily: "monospace" }}>
                                      {item.id}
                                    </div>

                                    {/* Price */}
                                    <div style={{ color: "#111827", fontWeight: 800, fontSize: "1.25rem", marginBottom: "12px" }}>
                                      {item.price ? LKR  : "Price N/A"}
                                    </div>

                                    {/* Description */}
                                    {item.description && (
                                      <div style={{ color: "#6b7280", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "20px" }}>
                                        {item.description.length > 250 ? item.description.substring(0, 250) + "..." : item.description}
                                      </div>
                                    )}

                                    {/* Variants block */}
                                    <div style={{ marginBottom: "20px" }}>
                                      <div style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "8px" }}>VARIANTS</div>
                                      <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", background: "#f9fafb" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>Default</span>
                                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>{item.price ? LKR  : ""}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                          <span style={{ fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>{item.id}</span>
                                          <span style={{ fontSize: "0.75rem", color: item.stock_level === "low_stock" ? "#d97706" : "#6b7280" }}>{item.stock_level === "low_stock" ? "Low stock" : "In stock"}</span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "4px" }}>Weight: {item.weight !== undefined ? item.weight : "0"}</div>
                                      </div>
                                    </div>

                                    {/* Details block */}
                                    <div style={{ marginBottom: "20px" }}>
                                      <div style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: "8px" }}>DETAILS</div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <div style={{ display: "flex", fontSize: "0.85rem" }}><div style={{ width: "100px", color: "#9ca3af" }}>Type</div><div style={{ color: "#374151" }}>{item.type || "specialGifts"}</div></div>
                                        <div style={{ display: "flex", fontSize: "0.85rem" }}><div style={{ width: "100px", color: "#9ca3af" }}>Subtype</div><div style={{ color: "#374151" }}>{item.subtype || "Product"}</div></div>
                                        <div style={{ display: "flex", fontSize: "0.85rem" }}><div style={{ width: "100px", color: "#9ca3af" }}>Weight</div><div style={{ color: "#374151" }}>{item.weight !== undefined ? item.weight : "0"}</div></div>
                                        <div style={{ display: "flex", fontSize: "0.85rem" }}><div style={{ width: "100px", color: "#9ca3af" }}>Vendor</div><div style={{ color: "#374151" }}>{item.vendor || "Kapruka"}</div></div>
                                      </div>
                                    </div>

                                    {/* Shipping block */}
                                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "20px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                      <div style={{ color: "#4c1d95", marginTop: "2px" }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>Shipping</div>
                                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Ships from LK</div>
                                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>International delivery available</div>
                                      </div>
                                      <div style={{ color: "#d1d5db" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                                      <button
                                        onClick={() => addToCart(item)}
                                        style={{ flex: 1, background: "#4c1d95", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
                                      >
                                        Add to Basket
                                      </button>
                                      
                                      {item.url && (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ flex: 1, background: "#ffffff", color: "#4c1d95", border: "1px solid #e5e7eb", padding: "10px", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                                        >
                                          View on Kapruka <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()"""
content = content.replace(layout_target, layout_replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Update script ran. Interface replaced: {interface_target in content}, Layout replaced: {layout_target in content}")
