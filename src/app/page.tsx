// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridgeCustom } from "@/lib/AppBridgeProvider";

export default function Home() {
  const app = useAppBridgeCustom();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    const host = params.get("host");

    if (app && (shop || host)) {
      const query = new URLSearchParams();
      if (shop) query.set("shop", shop);
      if (host) query.set("host", host);

      const redirect = Redirect.create(app);
      // ✅ 相対ではなく絶対URLで指定
      const targetUrl = `${process.env.NEXT_PUBLIC_SHOPIFY_APP_URL}/api/auth?${query.toString()}`;
      console.log("🔄 Redirecting to", targetUrl);

      redirect.dispatch(Redirect.Action.REMOTE, targetUrl);
    }
  }, [app]);

  return <p>Redirecting to authentication...</p>;
}
