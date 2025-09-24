// src/pages/api/auth/[...shopify].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string | undefined;
    const code = req.query.code as string | undefined;

    // ✅ iframe から来た場合 → Reauthorize 強制
    if (!code && shop) {
      const baseUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "";
      const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;

      console.log("🔥 Custom Reauthorize triggered", { shop, redirectUrl });

      res.status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
        .end();
      return;
    }

    // ✅ 認証コールバック
    if (code && shop) {
      const callbackResponse = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });

      await sessionStorage.storeSession(callbackResponse.session);

      console.log("✅ OAuth success (manual flow)", {
        shop: callbackResponse.session.shop,
      });

      return res.redirect("/admin/dashboard");
    }

    return res.status(400).send("Invalid auth request");
  } catch (err) {
    const error = err as Error;
    console.error("❌ Auth error:", error);
    return res.status(500).send("OAuth Callback Error: " + error.message);
  }
}
