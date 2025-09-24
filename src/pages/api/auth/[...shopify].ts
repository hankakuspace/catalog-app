// src/pages/api/auth/[...shopify].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sessionStorage } from "@/lib/shopify";
import type { Session } from "@shopify/shopify-api"; // 型だけ利用

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ✅ shop パラメータを query かヘッダから必ず取得
    const shop =
      (req.query.shop as string | undefined) ||
      (req.headers["x-shopify-shop-domain"] as string | undefined);

    const code = req.query.code as string | undefined;

    if (!shop) {
      return res.status(400).send("Missing shop parameter");
    }

    const baseUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "";

    // ✅ iframe アクセス時は必ず401返却 (Reauthorize ヘッダ付き)
    if (!code) {
      const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;
      console.log("🔥 Custom Reauthorize", { shop, redirectUrl });

      return res
        .status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
        .end("Reauthorize required");
    }

    // ✅ 認証開始
    if (!code) {
      const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${baseUrl}/api/auth&state=nonce`;
      console.log("🔗 Redirecting to", authUrl);
      return res.redirect(authUrl);
    }

    // ✅ 認証コールバック
    if (code) {
      const tokenUrl = `https://${shop}/admin/oauth/access_token`;
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();

      const session = {
        id: `${shop}_${Date.now()}`,
        shop,
        state: "nonce",
        isOnline: false,
        scope: process.env.SHOPIFY_SCOPES || "",
        accessToken: data.access_token,
        expires: null,
        onlineAccessInfo: null,
      };

      // ✅ 型エラー回避（Session 型としてキャスト）
      await sessionStorage.storeSession(session as unknown as Session);

      console.log("✅ OAuth success (manual)", { shop });

      return res.redirect("/admin/dashboard");
    }

    return res.status(400).send("Invalid auth request");
  } catch (err) {
    const error = err as Error;
    console.error("❌ Auth error:", error);
    return res.status(500).send("OAuth Callback Error: " + error.message);
  }
}
