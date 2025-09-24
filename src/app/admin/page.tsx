// src/app/admin/page.tsx
"use client";

import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import type { ClientApplication } from "@shopify/app-bridge";

export default function AdminPage() {
  const app = useAppBridge() as unknown as ClientApplication;

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/products");
        if (res.status === 401 && app) {
          // ✅ iframe内ではなくトップレベルでOAuthを開始
          const redirect = Redirect.create(app);
          redirect.dispatch(
            Redirect.Action.REMOTE,
            `https://catalog-app-swart.vercel.app/api/auth?shop=catalog-app-dev-2.myshopify.com`
          );
        }
      } catch (err) {
        console.error("セッション確認エラー:", err);
      }
    }
    checkSession();
  }, [app]);

  return (
    <div>
      <h1 className="text-xl font-bold">カタログアプリ 管理画面</h1>
      <p>ここに管理UIを追加していきます。</p>
    </div>
  );
}
