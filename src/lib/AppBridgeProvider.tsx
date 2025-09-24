// src/lib/AppBridgeProvider.tsx
"use client";

import { createContext, useContext, useEffect } from "react";
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

  if (!host || !process.env.NEXT_PUBLIC_SHOPIFY_API_KEY) {
    console.warn(
      "⚠️ host または NEXT_PUBLIC_SHOPIFY_API_KEY が未設定のため AppBridge は初期化されません"
    );
    return <>{children}</>;
  }

  // ✅ App Bridge 初期化
  const app = createApp({
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
    host,
    forceRedirect: true,
  });

  // ✅ 初回マウント時にリダイレクト確認
  useEffect(() => {
    if (!app) return;

    const redirect = Redirect.create(app);

    // Shopify が 401 + Reauthorize ヘッダを返したとき、
    // App Bridge がトップレベルリダイレクトを行えるようにする
    if (window.top === window.self) {
      // すでにトップレベル → 何もしない
      return;
    } else {
      // iframe 内 → トップレベルに強制リダイレクト
      redirect.dispatch(
        Redirect.Action.REMOTE,
        `${window.location.origin}/api/auth?shop=${new URLSearchParams(
          window.location.search
        ).get("shop")}`
      );
    }
  }, [app]);

  return (
    <AppBridgeReactContext.Provider value={{ app }}>
      {children}
    </AppBridgeReactContext.Provider>
  );
}
