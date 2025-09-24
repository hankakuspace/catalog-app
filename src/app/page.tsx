// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";

export default function Home() {
  const app = useAppBridge();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    const host = params.get("host");

    if (app && (shop || host)) {
      const query = new URLSearchParams();
      if (shop) query.set("shop", shop);
      if (host) query.set("host", host);

      const redirect = Redirect.create(app);
      redirect.dispatch(
        Redirect.Action.REMOTE,
        `/api/auth?${query.toString()}`
      );
    }
  }, [app]);

  return <p>Redirecting to authentication...</p>;
}
