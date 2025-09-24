// src/pages/api/auth/[...shopify].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string | undefined;
    const embedded = req.query.embedded;

    // ✅ 埋め込み (iframe) からアクセスされた場合 → 401 + Reauthorize
    if (embedded === "1" && shop) {
      console.log("🔥 embedded reauth handler triggered", { shop });
      res
        .status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader(
          "X-Shopify-API-Request-Failure-Reauthorize-Url",
          `/api/auth?shop=${shop}` // ✅ 正しいリダイレクト先を明示
        )
        .end();
      return;
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

      // ✅ セッションを保存
      await sessionStorage.storeSession(callbackResponse.session);

      console.log("✅ OAuth success, session stored:", {
        shop: callbackResponse.session.shop,
        accessToken: callbackResponse.session.accessToken ? "exists" : "missing",
      });

      // ✅ 認証後は必ず /admin/dashboard にリダイレクト
      return res.redirect("/admin/dashboard");
    }

    return res.status(400).send("Invalid auth request");
  } catch (err: unknown) {
    console.error("❌ Auth error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
