// src/app/page.tsx
"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const shop = new URLSearchParams(window.location.search).get("shop");
    if (shop) {
      window.location.href = `/api/auth?shop=${shop}`;
    } else {
      window.location.href = `/api/auth`;
    }
  }, []);

  return <p>Redirecting to authentication...</p>;
}
