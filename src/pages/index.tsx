// src/pages/index.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 認証開始へ誘導
    const shop = new URLSearchParams(window.location.search).get("shop");
    if (shop) {
      window.location.href = `/api/auth?shop=${shop}`;
    } else {
      // デフォルトでは Shopify の shop ドメインを取れないので、まずは /api/auth に直行
      window.location.href = `/api/auth`;
    }
  }, []);

  return <p>Redirecting to authentication...</p>;
}
