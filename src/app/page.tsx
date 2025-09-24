// src/app/page.tsx
"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");
    const host = params.get("host");

    if (shop && host) {
      window.location.href = `/api/auth?shop=${shop}&host=${host}`;
    } else if (shop) {
      window.location.href = `/api/auth?shop=${shop}`;
    } else if (host) {
      window.location.href = `/api/auth?host=${host}`;
    } else {
      window.location.href = `/api/auth`;
    }
  }, []);

  return <p>Redirecting to authentication...</p>;
}
