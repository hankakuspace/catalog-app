// src/app/admin/page.tsx
"use client";

import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";

export default function AdminPage() {
  const app: any = useAppBridge(); // ✅ 型をキャストしてエラー回避

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/products");
        if (res.status === 401 && app) {
          // ✅ 未認証ならトップレベルにリダイレクト
          const redirect = Redirect.create(app);
          redirect.dispatch(
            Redirect.Action.REMOTE,
            `/api/auth?shop=catalog-app-dev-2.myshopify.com`
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
