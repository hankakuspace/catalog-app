// src/pages/api/auth/[...shopify].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Step 1: 認証開始
    if (req.query.shop && !req.query.code) {
      const redirectUrl = await shopify.auth.begin({
        shop: req.query.shop as string,
        callbackPath: "/api/auth/[...shopify]",
        isOnline: false,
        rawRequest: req,
        rawResponse: res,
      });
      return res.redirect(redirectUrl);
    }

    // Step 2: コールバック処理
    if (req.query.code) {
      const callbackResponse = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });

      // ✅ callbackResponse.session を保存する
      await sessionStorage.storeSession(callbackResponse.session);

      console.log("✅ OAuth success, session stored:", {
        shop: callbackResponse.session.shop,
        accessToken: callbackResponse.session.accessToken ? "exists" : "missing",
      });

      return res.redirect("/admin");
    }

    return res.status(400).send("Invalid auth request");
  } catch (err: unknown) {
    console.error("❌ Auth error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
