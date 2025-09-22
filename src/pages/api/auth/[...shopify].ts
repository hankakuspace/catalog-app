// src/pages/api/auth/[...shopify].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Step 1: 認証開始
    if (req.query.shop && !req.query.code) {
      const redirectUrl = await shopify.auth.begin({
        shop: req.query.shop as string,
        callbackPath: "/api/auth/[...shopify]", // ✅ コールバック先をこのルートに
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

      // ✅ 修正: shopify.sessionStorage ではなく sessionStorage を利用
      await sessionStorage.storeSession(session);

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
