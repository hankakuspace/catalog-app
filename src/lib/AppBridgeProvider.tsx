// src/lib/AppBridgeProvider.tsx
"use client";

import { createContext, useContext, useMemo, useCallback } from "react";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { createApp, type ClientApplication } from "@shopify/app-bridge";

interface AppBridgeContextType {
  app: ClientApplication | null;
}

const AppBridgeReactContext = createContext<AppBridgeContextType>({ app: null });

export function useAppBridgeCustom() {
  return useContext(AppBridgeReactContext).app;
}

// Acquire a fresh token immediately before each request, preserving signal and headers.
export function useAdminFetch() {
  const app = useAppBridgeCustom();
  return useCallback(async (url: string, init: RequestInit = {}) => {
    if (!app) throw new Error("管理画面の認証準備ができていません");
    let token: string;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      token = await Promise.race([
        getSessionToken(app),
        new Promise<string>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Token timeout")), 10000);
        }),
      ]);
      if (!token) throw new Error();
    } catch {
      throw new Error("管理画面の認証に失敗しました。再読み込みしてください");
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { ...init, headers });
    if (response.status === 401 || response.status === 403) {
      throw new Error("認証またはアクセス権限を確認してください");
    }
    return response;
  }, [app]);
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
