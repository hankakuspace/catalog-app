// src/app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import Head from "next/head";
import Script from "next/script";

type ShopifyAppBridge = {
  default: (config: { apiKey: string; host: string }) => unknown;
  actions: {
    Redirect: {
      create: (app: unknown) => {
        dispatch: (action: string, path: string) => void;
      };
      Action: {
        APP: string;
        REMOTE: string;
      };
    };
  };
};

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host") || "";
    const shop = params.get("shop") || "";

    console.log("🔥 DEBUG callback host (raw base64):", host);
    console.log("🔥 DEBUG callback shop:", shop);

    const init = () => {
      const appBridgeGlobal = (window as unknown as Record<string, unknown>)["app-bridge"];
      if (!appBridgeGlobal) {
        console.error("❌ AppBridge not loaded");
        return;
      }

      const AppBridge = appBridgeGlobal as ShopifyAppBridge;

      const app = AppBridge.default({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
        host, // base64 のまま渡す
      });

      const redirect = AppBridge.actions.Redirect.create(app);
      console.log("🔥 DEBUG dispatching redirect to /admin/dashboard ...");
      redirect.dispatch(AppBridge.actions.Redirect.Action.APP, "/admin/dashboard");
    };

    (window as unknown as { onAppBridgeReady?: () => void }).onAppBridgeReady = init;
  }, []);

  return (
    <>
      <Head>
        <title>Auth Callback</title>
      </Head>
      <p>Redirecting back to app...</p>
      <Script
        src="https://unpkg.com/@shopify/app-bridge@3"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("🔥 AppBridge script loaded");
          (window as unknown as { onAppBridgeReady?: () => void }).onAppBridgeReady?.();
        }}
      />
    </>
  );
}
