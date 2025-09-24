// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Script from "next/script"; // ✅ 追加
import { AppBridgeProvider } from "@/lib/AppBridgeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Catalog App",
  description: "Shopify Embedded Catalog App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Next.js の Script コンポーネントで非同期読み込み */}
        <Script
          src="https://unpkg.com/@shopify/app-bridge@3"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppBridgeProvider>{children}</AppBridgeProvider>
      </body>
    </html>
  );
}
