// src/pages/exitiframe.tsx
import { useEffect } from "react";
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";

export default function ExitIframe() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    const shop = params.get("shop");

    if (!host || !shop) {
      // パラメータ不足なら認証に戻す
      window.location.href = "/api/auth";
      return;
    }

    // ✅ App Bridge 初期化
    const app = createApp({
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
      host,
    });

    // ✅ アプリTOP (/apps/{handle}) にリダイレクト
    const redirect = Redirect.create(app);
    redirect.dispatch(Redirect.Action.APP, "/");
  }, []);

  return <p>Redirecting out of iframe...</p>;
}
