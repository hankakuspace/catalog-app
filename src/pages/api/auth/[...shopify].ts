// src/pages/api/auth/[...shopify].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string | undefined;
    const code = req.query.code as string | undefined;

    // ✅ iframe (埋め込み) からの最初のアクセス → 必ず401で返す
    if (!code && shop) {
      const baseUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "";
      const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;

      console.log("🔥 Force Reauthorize (iframe)", { shop, redirectUrl });

      res.status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
        .end();
      return;
    }

    // ✅ 認証コールバック処理
    if (code && shop) {
      const callbackResponse = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });

      // セッション保存
      await sessionStorage.storeSession(callbackResponse.session);

      console.log("✅ OAuth success", {
        shop: callbackResponse.session.shop,
      });

      // 認証後はダッシュボードへ
      return res.redirect("/admin/dashboard");
    }

    return res.status(400).send("Invalid auth request");
  } catch (err: any) {
    console.error("❌ Auth error:", err);
    return res.status(500).send("OAuth Callback Error: " + err.message);
  }
}
