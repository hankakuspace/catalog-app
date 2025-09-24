// src/lib/AppBridgeProvider.tsx
"use client";

import { createContext, useContext } from "react";
import { createApp, type ClientApplication } from "@shopify/app-bridge";

interface AppBridgeContextType {
  app: ClientApplication | null;
}

const AppBridgeReactContext = createContext<AppBridgeContextType>({ app: null });

export function useAppBridgeCustom() {
  return useContext(AppBridgeReactContext).app;
}

export function AppBridgeProvider({ children }: { children: React.ReactNode }) {
  const host =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("host") || ""
      : "";

  if (!host || !process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
    console.warn("⚠️ host または NEXT_PUBLIC_SHOPIFY_API_KEY が未設定のため AppBridge は初期化されません");
    return <>{children}</>;
  }

  const app = createApp({
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
    host,
    forceRedirect: true,
  });

  return (
    <AppBridgeReactContext.Provider value={{ app }}>
      {children}
    </AppBridgeReactContext.Provider>
  );
}
