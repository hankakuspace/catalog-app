// src/pages/api/auth/[...shopify].ts
import { shopify } from "@/lib/shopify";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Step 1: 認証開始
    if (req.query.shop && !req.query.code) {
      const redirectUrl = await shopify.auth.begin({
        shop: req.query.shop as string,
        callbackPath: "/api/auth/callback",
        isOnline: false,
        rawRequest: req,
        rawResponse: res,
      });
      return res.redirect(redirectUrl);
    }

    // Step 2: コールバック処理
    if (req.query.code) {
      const session = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });

      await shopify.sessionStorage.storeSession(session);

      console.log("✅ OAuth success, session stored:", {
        shop: session.shop,
        accessToken: session.accessToken ? "exists" : "missing",
      });

      return res.redirect("/admin"); // 認証後に管理UIへ
    }

    return res.status(400).send("Invalid auth request");
  } catch (err: unknown) {
    console.error("❌ Auth error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
