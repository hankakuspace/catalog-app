// src/app/page.tsx
"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    const host = params.get("host");

    if (shop || host) {
      const query = new URLSearchParams();
      if (shop) query.set("shop", shop);
      if (host) query.set("host", host);

      // ✅ iframe 内でなくトップウィンドウでリダイレクト
      if (window.top) {
        (window.top as Window).location.href = `/api/auth?${query.toString()}`;
      } else {
        window.location.href = `/api/auth?${query.toString()}`;
      }
    }
  }, []);

  return <p>Redirecting to authentication...</p>;
}
