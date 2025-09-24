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

    // ✅ iFrame からの最初のアクセス → 401 強制
    if (!code && req.headers["x-shopify-api-request-failure-reauthorize"] === undefined) {
      const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;
      console.log("🔥 Force Reauthorize", { shop, redirectUrl });

      res.status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
        .send("Reauthorize required");
      return;
    }

    // ✅ 認証開始 (手動でOAuth URLへ302リダイレクト)
    if (!code) {
      const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${baseUrl}/api/auth&state=nonce`;
      console.log("🔗 Redirecting to OAuth", authUrl);
      return res.redirect(authUrl);
    }

    // ✅ 認証コールバック
    if (code) {
      const callbackResponse = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });

      await sessionStorage.storeSession(callbackResponse.session);

      console.log("✅ OAuth success", { shop: callbackResponse.session.shop });

      return res.redirect("/admin/dashboard");
    }

    return res.status(400).send("Invalid auth request");
  } catch (err) {
    const error = err as Error;
    console.error("❌ Auth error:", error);
    return res.status(500).send("OAuth Callback Error: " + error.message);
  }
}
