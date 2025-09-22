// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, fetchProducts } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ 現在のセッションIDを取得
    const sessionId = await shopify.session.getCurrentId({
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    if (!sessionId) {
      throw new Error("セッションが見つかりません。OAuth 認証が必要です。");
    }

    // ✅ セッションをロード
    const session = await shopify.sessionStorage.loadSession(sessionId);
    if (!session) {
      throw new Error("セッションのロードに失敗しました。");
    }

    // ✅ fetchProducts を利用して商品取得
    const products = await fetchProducts(session);

    return res.status(200).json(products);
  } catch (err: unknown) {
    console.error("API /products error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
