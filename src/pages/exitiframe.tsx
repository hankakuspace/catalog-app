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
    const appHandle = process.env.NEXT_PUBLIC_SHOPIFY_APP_HANDLE;

    if (!apiKey || !appHandle) {
      console.error("Missing env vars: NEXT_PUBLIC_SHOPIFY_API_KEY or NEXT_PUBLIC_SHOPIFY_APP_HANDLE");
      window.location.href = "/api/auth";
      return;
    }

    const app = createApp({
      apiKey,
      host,
      forceRedirect: true,
    });

    const redirect = Redirect.create(app);
    redirect.dispatch(Redirect.Action.ADMIN_PATH, `/apps/${appHandle}`);
  }, []);

  return <p>Redirecting out of iframe...</p>;
}
