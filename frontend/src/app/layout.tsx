import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  themeColor: "#392061",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Kapruka AI Shopping Agent | KIKO",
  description: "Experience the most innovative AI shopping assistant for Kapruka Sri Lanka. Discover, compare, and inspect products in real-time using KIKO, your personal shopping agent.",
  keywords: ["Kapruka", "AI Shopping Agent", "Sri Lanka eCommerce", "KIKO", "Smart Assistant", "Online Shopping", "Gift Delivery"],
  authors: [{ name: "Jayashan Manodya", url: "https://www.jayashan.online" }],
  openGraph: {
    title: "Kapruka AI Shopping Agent | KIKO",
    description: "Experience the most innovative AI shopping assistant for Kapruka Sri Lanka. Discover, compare, and inspect products in real-time.",
    siteName: "Kapruka AI Shopping Agent",
    images: [
      {
        url: "/kiko.png",
        width: 1200,
        height: 630,
        alt: "Kapruka AI Shopping Agent - KIKO",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kapruka AI Shopping Agent | KIKO",
    description: "Experience the most innovative AI shopping assistant for Kapruka Sri Lanka.",
    images: ["/kiko.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
