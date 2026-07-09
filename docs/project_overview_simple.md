# The Kapuruka Shopping Agent (KIKO): A Simple Guide

Imagine you walk into a store, and instead of wandering the aisles looking for what you need, a friendly assistant walks right up to you, finds exactly what you want, answers your questions in your native language, and even handles the checkout for you. 

That is exactly what this project—the **Kapuruka Shopping Agent (KIKO)**—does for the Kapruka.com website! 

Here is a simple, plain-English breakdown of what this project actually is and how its pieces fit together.

---

## 🎯 1. What is this project?
Normally, when you shop online, you have to click through menus, use search bars, add things to a cart, and fill out long checkout forms. 

This project completely removes all of that. It is a **chat-based website**. You simply type, *"I want to buy a chocolate cake for my mom in Colombo,"* and KIKO handles the rest. It talks to you, shows you pictures of cakes, adds them to your cart, and places the order—all inside a simple chat window.

---

## 🧠 2. The "Brain" (The Backend)
The "Brain" of the project is a Python program. But it's not just one single brain; it's actually a team of "AI Employees" that work together behind the scenes:

* **The Manager (Supervisor Agent):** When you type a message, the Manager reads it first. It decides which of its employees is best suited to help you.
* **The Salesperson (Search Agent):** If you are looking for products, the Manager hands you to the Salesperson. This agent searches the Kapruka database, shows you products, and tries to be helpful by suggesting add-ons (like suggesting a greeting card when you buy a gift).
* **The Cashier (Checkout Agent):** When you are ready to pay, the Cashier takes over. It asks for your delivery address, calculates your shipping fees, shows you the final bill, and creates the order securely.
* **The Support Rep (Tracking Agent):** If you just want to know where your package is, this agent takes your order number and tells you the delivery status.

This entire "Brain" is completely invisible to the user. It just sits in the background, making smart decisions and talking to Kapruka's databases.

---

## 🖥️ 3. The "Face" (The Frontend)
The "Face" of the project is the actual website the user sees on their screen. It is built using modern web tools (Next.js and React).

Instead of just showing boring text like a standard ChatGPT window, the Face of KIKO is highly interactive! 
* When the Salesperson (Brain) finds a cake, the Face (Website) draws a beautiful, clickable **Product Card** with an image, price, and an "Add to Cart" button right inside the chat.
* When the Cashier (Brain) needs your address, the Face draws a clean **Checkout Form** for you to fill out.

---

## ✨ 4. The Magic Features
What makes this project special?

1. **It speaks your language:** You don't have to speak perfect English. You can type in Sinhala, Tamil, or "Singlish" (typing Sinhala words using English letters). KIKO understands you, translates it internally to search the store, and replies back to you in your preferred language.
2. **It has a memory:** If you add a gift to your cart, close your laptop, and come back two days later, KIKO remembers exactly what is in your basket.
3. **No hallucination:** AI is famous for making things up. KIKO has strict safety locks (a "QA Tester" agent) that prevent it from inventing fake products or making up fake delivery prices. It only shows real data from Kapruka.

## Summary
In short, this project is a complete replacement for standard online shopping. It combines a smart, multi-agent AI brain with a beautiful, interactive chat website to make buying things online as easy as texting a friend!
