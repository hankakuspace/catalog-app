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

    // ✅ OAuth開始
    const redirectUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/api/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    // ✅ redirect 後は return で終了
    res.redirect(redirectUrl);
    return;
  } catch (err: unknown) {
    console.error("❌ /api/auth error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
