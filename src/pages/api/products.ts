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
      // デバッグ: 保存されているセッションを一覧表示
      // ※ MemorySessionStorage なので dev 中だけ有効
      // @ts-ignore
      if (sessionStorage.sessions) {
        // eslint-disable-next-line no-console
        console.log("📦 保存されているセッション一覧:", sessionStorage.sessions);
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
  } catch (err: any) {
    console.error("❌ /api/products エラー詳細:", err);
    return res.status(500).json({ error: err.message });
  }
}
