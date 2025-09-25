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
  let host =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("host") || ""
      : "";

  // ✅ host があれば localStorage に保存、なければ復元
  if (typeof window !== "undefined") {
    if (host) {
      localStorage.setItem("shopify_host", host);
    } else {
      host = localStorage.getItem("shopify_host") || "";
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

  // ✅ 401 → Reauthorize のケースでもトップに飛ばせる
  useEffect(() => {
    if (!app) return;
    const redirect = Redirect.create(app);
    const shop = new URLSearchParams(window.location.search).get("shop");
    if (window.top !== window.self && shop) {
      // ✅ 相対パスで十分
      const redirectUrl = `/api/auth?shop=${shop}`;
      console.log("🔄 AppBridge redirect to:", redirectUrl);
      redirect.dispatch(Redirect.Action.REMOTE, redirectUrl);
    }
  }, [app]);

  return (
    <AppBridgeReactContext.Provider value={{ app }}>
      {children}
    </AppBridgeReactContext.Provider>
  );
}
