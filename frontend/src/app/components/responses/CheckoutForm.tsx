import React, { useState } from "react";
import { User, MapPin, Calendar, MessageSquare, Truck, Gift, Send } from "lucide-react";

interface CheckoutFormProps {
  message: string;
  initialData?: {
    recipientName?: string;
    phone?: string;
    address?: string;
    city?: string;
    date?: string;
    senderName?: string;
    giftMessage?: string;
  };
  onSubmit: (details: {
    recipientName: string;
    phone: string;
    address: string;
    city: string;
    date: string;
    senderName: string;
    giftMessage?: string;
  }) => void;
}

const VALID_CITIES = [
  "Ampara", "Anuradhapura", "Avissawella", "Badulla", "Batticaloa", 
  "Colombo 01", "Colombo 02", "Colombo 03", "Colombo 04", "Colombo 05", 
  "Colombo 06", "Colombo 07", "Colombo 08", "Colombo 09", "Colombo 10", 
  "Colombo 11", "Colombo 12", "Colombo 13", "Colombo 14", "Colombo 15",
  "Dehiwala", "Galle", "Gampaha", "Hambantota", "Homagama", "Jaffna", 
  "Kadawatha", "Kaduwela", "Kalutara", "Kandy", "Kegalle", "Kelaniya", 
  "Kesbewa", "Kilinochchi", "Kiribathgoda", "Kolonnawa", "Kotte", 
  "Kurunegala", "Maharagama", "Mannar", "Matale", "Matara", "Monaragala", 
  "Moratuwa", "Mullaitivu", "Nuwara Eliya", "Padukka", "Peliyagoda", 
  "Polonnaruwa", "Puttalam", "Ragama", "Rathnapura", "Ratmalana", 
  "Trincomalee", "Vavuniya", "Wellampitiya"
];

export default function CheckoutForm({ message, initialData, onSubmit }: CheckoutFormProps) {
  const [formData, setFormData] = useState(() => {
    let saved = null;
    if (typeof window !== "undefined") {
       try {
         saved = JSON.parse(localStorage.getItem("kapruka_saved_address") || "null");
       } catch(e) {}
    }
    return {
      recipientName: initialData?.recipientName || saved?.recipient?.name || "",
      phone: initialData?.phone || saved?.recipient?.phone || "",
      address: initialData?.address || saved?.delivery?.address || "",
      city: initialData?.city || saved?.delivery?.city || "",
      date: initialData?.date || "",
      senderName: initialData?.senderName || "",
      giftMessage: initialData?.giftMessage || "",
    };
  });

  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const filteredCities = VALID_CITIES.filter(c => c.toLowerCase().includes(formData.city.toLowerCase()));

  const handleCitySelect = (city: string) => {
    setFormData(prev => ({ ...prev, city }));
    setShowCityDropdown(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getTomorrowDateString = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    return tmr.toISOString().split("T")[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!VALID_CITIES.includes(formData.city)) {
      alert("Please select a valid city from the dropdown menu.");
      return;
    }
    
    // Validate phone number
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert("Phone number must be exactly 10 digits.");
      return;
    }

    // Validate future date
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // reset time to start of today
    if (selectedDate <= today) {
      alert("Delivery date must be a future date.");
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="animate-fade-in agent-card-glow" style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "12px", background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)", border: "1px solid rgba(83,34,184,0.1)" }}>
      {/* Header */}
      <div style={{ background: "#3b2667", padding: "18px 24px", color: "#fff", display: "flex", alignItems: "center", gap: "12px" }}>
        <Truck size={22} color="#fff" />
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff", letterSpacing: "0.3px" }}>Delivery Details</span>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {message && (
          <div style={{ color: "#4b5563", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "20px" }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                <User size={14} /> Recipient Name
              </label>
              <input required name="recipientName" value={formData.recipientName} onChange={handleChange} placeholder="e.g. Nimal Perera" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                Phone Number
              </label>
              <input required name="phone" type="tel" pattern="[0-9]{10}" maxLength={10} value={formData.phone} onChange={handleChange} placeholder="07XXXXXXXX" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
              <MapPin size={14} /> Delivery Address
            </label>
            <input required name="address" value={formData.address} onChange={handleChange} placeholder="No 123, Galle Road" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280" }}>City</label>
              <input
                required
                name="city"
                value={formData.city}
                onChange={handleChange}
                onFocus={() => setShowCityDropdown(true)}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                placeholder="Colombo 01-15"
                style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
              {showCityDropdown && filteredCities.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", marginTop: "4px", maxHeight: "150px", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {filteredCities.map((c) => (
                    <div
                      key={c}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent onBlur from firing before click
                        handleCitySelect(c);
                      }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.9rem", color: "#333", borderBottom: "1px solid #f3f4f6" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={14} /> Date
              </label>
              <input required type="date" name="date" min={getTomorrowDateString()} value={formData.date} onChange={handleChange} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
              <User size={14} /> Sender Name (Your Name)
            </label>
            <input required name="senderName" value={formData.senderName} onChange={handleChange} placeholder="e.g. Kasun" style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
              <Gift size={14} /> Gift Message (Optional)
            </label>
            <textarea name="giftMessage" value={formData.giftMessage} onChange={handleChange} placeholder="Happy Birthday!" rows={2} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }} />
          </div>

          <button type="submit" className="glow-button" style={{ marginTop: "10px", background: "#facc15", color: "#1e1b4b", border: "none", padding: "14px", borderRadius: "12px", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}>
            <Send size={18} /> Submit Details
          </button>
        </form>
      </div>
    </div>
  );
}
