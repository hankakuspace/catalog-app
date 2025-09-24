// src/pages/api/auth/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string;

    if (!shop) {
      res.status(400).send("Missing shop parameter");
      return;
    }

    // ✅ Shopify 管理画面の iframe 内で開かれても、認証画面はトップレベルで開けるようにする
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors https://admin.shopify.com https://*.myshopify.com"
    );

    // ✅ OAuth開始
    const redirectUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/api/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    res.redirect(redirectUrl);
    return; // ✅ ここで処理を終了
  } catch (err: unknown) {
    console.error("❌ /api/auth error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
