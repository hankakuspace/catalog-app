// src/pages/api/auth/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string;

    if (!shop) {
      return res.status(400).send("Missing shop parameter");
    }

    // ✅ OAuth開始
    const redirectUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/api/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    return res.redirect(redirectUrl);
  } catch (err: unknown) {
    console.error("❌ /api/auth error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
