// src/pages/exitiframe.tsx
import { useEffect } from "react";
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";

export default function ExitIframe() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    const shop = params.get("shop");

    if (!host || !shop) {
      window.location.href = "/api/auth";
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
    if (!apiKey) {
      console.error("❌ NEXT_PUBLIC_SHOPIFY_API_KEY is missing");
      window.location.href = "/api/auth";
      return;
    }

    // ✅ App Bridge 初期化
    const app = createApp({
      apiKey,
      host,
      forceRedirect: true,
    });

    // ✅ ポイント: アプリのTOP ("/") に戻す
    const redirect = Redirect.create(app);
    redirect.dispatch(Redirect.Action.APP, "/");
  }, []);

  return <p>Redirecting out of iframe...</p>;
}
