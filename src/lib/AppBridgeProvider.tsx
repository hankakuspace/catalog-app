// src/lib/AppBridgeProvider.tsx
"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { createApp, type ClientApplication } from "@shopify/app-bridge";
import { Redirect } from "@shopify/app-bridge/actions";

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

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

  // ✅ useMemoで AppBridge を初期化
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

  // ✅ useEffect は常に呼び出す
  useEffect(() => {
    if (!app) return;

    const redirect = Redirect.create(app);

    if (window.top !== window.self) {
      // iframe 内 → トップレベルに強制リダイレクト
      const shop = new URLSearchParams(window.location.search).get("shop");
      if (shop) {
        redirect.dispatch(
          Redirect.Action.REMOTE,
          `${window.location.origin}/api/auth?shop=${shop}`
        );
      }
    }
  }, [app]);

  return (
    <AppBridgeReactContext.Provider value={{ app }}>
      {children}
    </AppBridgeReactContext.Provider>
  );
}
