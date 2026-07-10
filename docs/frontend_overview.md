# Kapuruka Shopping Agent: Frontend Architecture

The frontend of KIKO is built using **Next.js 16** and **React 19** with **TypeScript**. It is not just a standard "text-in, text-out" chatbot; it is a highly dynamic UI engine designed to intercept structured JSON from the Python backend and render beautiful, interactive e-commerce components directly inside the chat window.

---

## 1. Core Technologies
- **Framework:** Next.js (App Router)
- **UI Library:** React 19
- **Language:** TypeScript
- **Styling:** Custom CSS (`globals.css`) & Lucide Icons for iconography.
- **State Management:** React Context API & Custom Hooks.

---

## 2. The Main Chat Interface (`src/app/page.tsx`)
This is the heart of the frontend. It contains the main chat window.
- **Message List:** Displays the conversation history. It maps over the state array of messages.
- **Input Area:** A sticky text box at the bottom where users type their queries (in English, Sinhala, or Tamil).
- **Auto-Scrolling:** Automatically scrolls down as new messages arrive.

---

## 3. Dynamic JSON Rendering (The Magic)
Unlike standard chatbots (like ChatGPT) that just print markdown text, KIKO's backend returns structured JSON (e.g., `{"type": "product_detail", ...}`). The frontend acts as a rendering engine for this JSON.

When `page.tsx` receives a message, it looks at the `type` field and mounts a specific React component located in `src/app/components/`:

| Backend JSON Type | Frontend React Component | What the User Sees |
| :--- | :--- | :--- |
| `text` | `<ChatBubble />` | A standard chat bubble with conversational text in their native language. |
| `recommended_items` | `<ProductGrid />` | A horizontally scrolling carousel or grid of clickable product cards. |
| `product_detail` | `<ProductDetailCard />` | A large, rich card showing multiple images, price, description, and an "Add to Cart" button. |
| `checkout_form` | `<CheckoutForm />` | An interactive HTML form asking for Phone, Address, City, and Date. Submitting this form sends the data back to the AI as a chat message! |
| `order_summary` | `<Invoice />` | A clean receipt showing the cart items, delivery fee, and grand total, asking for a final "Yes" to proceed. |
| `order_created` | `<SuccessCard />` | A celebratory message with the Order Number and a bright button linking to the secure payment gateway. |

---

## 4. State Management (`src/context/` & `src/hooks/`)
To keep track of the shopping journey, the frontend uses React Context and local storage.

- **Conversation State:** Stores the array of chat messages so the user doesn't lose their history if they refresh the page.
- **Cart State:** The frontend secretly tracks what the user has added to their cart. 
  - *Crucial Detail:* Whenever the user asks to checkout, the frontend automatically bundles this hidden Cart State into the system prompt so the backend Checkout Agent knows exactly what to bill them for!
- **Loading States:** Displays typing indicators (e.g., "KIKO is thinking...") while waiting for the FastAPI backend to respond.

---

## 5. The API Bridge (`src/app/api/`)
Because browsers shouldn't talk directly to raw AI endpoints for security reasons, Next.js API routes act as a secure middleman.

1. The React component (`page.tsx`) makes a `POST` request to the Next.js internal API (e.g., `/api/chat`).
2. The Next.js API securely attaches necessary headers and forwards the request to the Python FastAPI backend running on port `8000`.
3. It receives the JSON response from Python and passes it safely back to the browser.

---

## 6. Styling (`src/app/globals.css`)
The application avoids generic browser defaults. It uses a carefully crafted CSS architecture to provide a premium feel:
- **Brand Integration:** Uses Kapruka's brand colors (or tailored HSL palettes) for buttons and active states.
- **Micro-animations:** Smooth transitions when product cards appear or when a user hovers over the "Add to Cart" button.
- **Responsive Design:** Completely optimized for mobile phones (since most Kapruka users shop via mobile), ensuring the chat window and product grids stack perfectly on small screens.
