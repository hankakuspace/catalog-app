// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sessionStorage, fetchProducts } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const shop = req.query.shop as string;
    if (!shop) {
      return res.status(400).json({ error: "Missing shop parameter" });
    }

    // ✅ shop をキーに直接セッションをロード
    const session = await sessionStorage.loadSession(shop);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized: セッションがロードできません" });
    }

    console.log("🔥 Debug session in /api/products:", {
      shop: session.shop,
      accessToken: session.accessToken ? "存在する" : "なし",
    });

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
