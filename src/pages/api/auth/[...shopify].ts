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
    const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;

    // ✅ iframe からの最初のアクセス → 必ず401で Reauthorize ヘッダを返す
    if (!code) {
      console.log("🔥 Returning Reauthorize headers", { shop, redirectUrl });

      res.status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
        .send("Reauthorize required");
      return;
    }

    // ✅ 認証コールバック
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    await sessionStorage.storeSession(callbackResponse.session);

    console.log("✅ OAuth success", { shop: callbackResponse.session.shop });

    return res.redirect("/admin/dashboard");
  } catch (err) {
    const error = err as Error;
    console.error("❌ Auth error:", error);
    return res.status(500).send("OAuth Callback Error: " + error.message);
  }
}
