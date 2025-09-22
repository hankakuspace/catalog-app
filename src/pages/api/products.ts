// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage, fetchProducts } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sessionId = await shopify.session.getCurrentId({
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    if (!sessionId) {
      throw new Error("セッションが見つかりません。OAuth 認証を実行してください。");
    }

    const session = await sessionStorage.loadSession(sessionId);
    if (!session) {
      throw new Error("セッションのロードに失敗しました。");
    }

    console.log("🔥 Debug session:", {
      shop: session.shop,
      accessToken: session.accessToken ? "exists" : "missing",
    });

    const products = await fetchProducts(session);

    return res.status(200).json(products);
  } catch (err: unknown) {
    console.error("❌ API /products error:", err);
    return res.status(500).json({
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
  }
}
