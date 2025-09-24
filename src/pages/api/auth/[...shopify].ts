// src/pages/api/auth/[...shopify].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string | undefined;
    const embedded = req.query.embedded;

    // ✅ iframe から呼ばれたときは必ずここで処理を止める
    if (embedded === "1" && shop) {
      const baseUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "";
      const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;

      console.log("🔥 Forced embedded reauth", { shop, redirectUrl });

      res.status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
        .end();
      return; // ✅ ここで終了。SDK に渡さない。
    }

    // Step 1: 認証開始
    if (shop && !req.query.code) {
      const redirectUrl = await shopify.auth.begin({
        shop,
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

      // ✅ セッション保存
      await sessionStorage.storeSession(callbackResponse.session);

      console.log("✅ OAuth success, session stored:", {
        shop: callbackResponse.session.shop,
        accessToken: callbackResponse.session.accessToken ? "exists" : "missing",
      });

      // ✅ 認証後はダッシュボードへ
      return res.redirect("/admin/dashboard");
    }

    return res.status(400).send("Invalid auth request");
  } catch (err: unknown) {
    console.error("❌ Auth error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
