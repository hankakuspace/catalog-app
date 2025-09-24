// src/pages/api/auth/[...shopify].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string | undefined;
    const code = req.query.code as string | undefined;

    if (!shop) {
      return res.status(400).send("Missing shop parameter");
    }

    const baseUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "";

    // ✅ iframe から最初に来た場合 → 必ず401でフルURLを返す
    if (!code) {
      const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;
      console.log("🔥 Custom Reauthorize triggered", { shop, redirectUrl });

      res.status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
        .end();
      return;
    }

    // ✅ 認証コールバック処理
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    // セッション保存
    await sessionStorage.storeSession(callbackResponse.session);

    console.log("✅ OAuth success (manual)", {
      shop: callbackResponse.session.shop,
    });

    // 認証後は必ずダッシュボードへ
    return res.redirect("/admin/dashboard");
  } catch (err) {
    const error = err as Error;
    console.error("❌ Auth error:", error);
    return res.status(500).send("OAuth Callback Error: " + error.message);
  }
}
