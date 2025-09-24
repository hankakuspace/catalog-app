// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import React, { createContext, useMemo } from "react";
import createApp from "@shopify/app-bridge";

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

// ✅ App Bridge Context
export const AppBridgeContext = createContext<any>(null);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const host =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("host") || ""
      : "";

  const appBridgeConfig = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
    host,
    forceRedirect: true,
  };

  // ✅ 初期化（useMemoで1回だけ）
  const appBridge = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createApp(appBridgeConfig);
  }, [host]);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppBridgeContext.Provider value={appBridge}>
          {children}
        </AppBridgeContext.Provider>
      </body>
    </html>
  );
}
