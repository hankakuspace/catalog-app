// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage, fetchProducts } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. オンラインセッション (JWT)
    const sessionId = await shopify.session.getCurrentId({
      isOnline: true,
      rawRequest: req,
      rawResponse: res,
    });

    let session = sessionId ? await sessionStorage.loadSession(sessionId) : null;

    // 2. fallback: shopキー
    const shop = req.query.shop as string | undefined;
    if (!session && shop) {
      session = await sessionStorage.loadSession(shop);
    }

    if (!session) {
      console.error("❌ セッションが見つからない", { sessionId, shop });

      // デバッグ: 保存されているセッション一覧を出力（MemorySessionStorage 開発用）
      const devSessions = (sessionStorage as unknown as { sessions?: unknown }).sessions;
      if (devSessions) {
        console.log("📦 保存されているセッション一覧:", devSessions);
      }

      return res.status(401).json({ error: "Unauthorized: セッションがロードできません" });
    }

    console.log("🔥 Debug /api/products:", {
      id: session.id,
      shop: session.shop,
      accessToken: session.accessToken ? "存在する" : "なし",
    });

    const products = await fetchProducts(session);
    return res.status(200).json({ products });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ /api/products エラー詳細:", error);
    return res.status(500).json({ error: error.message });
  }
}
