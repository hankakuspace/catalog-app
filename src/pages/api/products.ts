// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage, fetchProducts } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. オンラインセッション (JWT + authenticatedFetch)
    const sessionId = await shopify.session.getCurrentId({
      isOnline: true,
      rawRequest: req,
      rawResponse: res,
    });

    let session = sessionId ? await sessionStorage.loadSession(sessionId) : null;

    // 2. Fallback: オフラインセッション (shop ドメインをキーに探す)
    const shop = req.query.shop as string | undefined;
    if (!session && shop) {
      session = await sessionStorage.loadSession(shop);
    }

    if (!session) {
      console.error("❌ セッションが見つからない", { sessionId, shop });
      return res.status(401).json({ error: "Unauthorized: セッションがロードできません" });
    }

    console.log("🔥 Debug /api/products:", {
      id: session.id,
      shop: session.shop,
      accessToken: session.accessToken ? "存在する" : "なし",
    });

    // 3. 商品データを取得
    const products = await fetchProducts(session);

    return res.status(200).json({ products });
  } catch (err: unknown) {
    console.error("❌ /api/products エラー詳細:", err);
    return res.status(500).json({
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
  }
}
