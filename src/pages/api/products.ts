// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage, fetchProducts } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ セッションIDを取得
    const sessionId = await shopify.session.getCurrentId({
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    if (!sessionId) {
      // 500ではなく401を返す（App Bridge RedirectでOAuth開始させる）
      res.status(401).json({ error: "Unauthorized: セッションIDが見つかりません" });
      return;
    }

    // ✅ セッションをロード
    const session = await sessionStorage.loadSession(sessionId);
    if (!session) {
      res.status(401).json({ error: "Unauthorized: セッションがロードできません" });
      return;
    }

    console.log("🔥 Debug session in /api/products:", {
      shop: session.shop,
      accessToken: session.accessToken ? "存在する" : "なし",
    });

    // ✅ 商品データを取得
    const products = await fetchProducts(session);

    return res.status(200).json(products);
  } catch (err: unknown) {
    console.error("❌ /api/products エラー詳細:", err);
    return res.status(500).json({
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
  }
}
