// src/lib/AppBridgeProvider.tsx
"use client";

import { createContext, useContext, useMemo } from "react";
import { createApp, type ClientApplication } from "@shopify/app-bridge";

interface AppBridgeContextType {
  app: ClientApplication | null;
}

const AppBridgeReactContext = createContext<AppBridgeContextType>({ app: null });

export function useAppBridgeCustom() {
  return useContext(AppBridgeReactContext).app;
}

export function AppBridgeProvider({ children }: { children: React.ReactNode }) {
  let host =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("host") || ""
      : "";

  // host と shop をlocalStorageへ保存し、hostがURLにない場合は復元する
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");

    if (host) {
      localStorage.setItem("shopify_host", host);
    } else {
      host = localStorage.getItem("shopify_host") || "";
    }

    if (shop) {
      localStorage.setItem("shopify_shop", shop);
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

  const app = useMemo(() => {
    if (!host || !apiKey) {
      console.warn("⚠️ host または NEXT_PUBLIC_SHOPIFY_API_KEY が未設定");
      return null;
    }

    return createApp({
      apiKey,
      host,
      forceRedirect: true,
    });
  }, [host, apiKey]);

  return (
    <AppBridgeReactContext.Provider value={{ app }}>
      {children}
    </AppBridgeReactContext.Provider>
  );
}
