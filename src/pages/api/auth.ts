// src/pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import { sessionStorage } from "@/lib/shopify";
import type { Session } from "@shopify/shopify-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.warn("🔥 DEBUG req.query:", req.query);
    console.warn("🔥 DEBUG req.headers:", req.headers);

    let shop: string | undefined;

    // 1. クエリから取得
    if (typeof req.query.shop === "string") {
      shop = req.query.shop;
    } else if (Array.isArray(req.query.shop)) {
      shop = req.query.shop[0];
    }

    // 2. ヘッダから取得
    if (!shop && req.headers["x-shopify-shop-domain"]) {
      shop = req.headers["x-shopify-shop-domain"] as string;
    }

    // 3. Cookie から取得
    if (!shop && req.headers.cookie) {
      const cookies = parse(req.headers.cookie);
      if (cookies["shop"]) shop = cookies["shop"];
    }

    // 4. host パラメータを decode して取得
    if (!shop && typeof req.query.host === "string") {
      try {
        const decoded = Buffer.from(req.query.host, "base64").toString("utf-8");
        // 例: "catalog-app-dev-2.myshopify.com/admin"
        shop = decoded.split("/")[0];
        console.log("🔥 Decoded shop from host:", shop);
      } catch (e) {
        console.error("❌ Failed to decode host:", req.query.host, e);
      }
    }

    const code = Array.isArray(req.query.code)
      ? req.query.code[0]
      : (req.query.code as string | undefined);

    if (!shop) {
      console.error("❌ Missing shop parameter. req.query:", req.query);
      return res.status(400).send("Missing shop parameter");
    }

    const baseUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "";

    // ✅ コードがまだない場合（認証前）
    if (!code) {
      // iframe 内からのアクセスなら → 401 + Reauthorize ヘッダを返す
      if (req.headers["sec-fetch-dest"] === "iframe") {
        const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;
        console.log("🔥 Custom Reauthorize", { shop, redirectUrl });

        return res
          .status(401)
          .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
          .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
          .send("");
      }

      // iframe 以外（通常のブラウザリダイレクト時）は OAuth 開始
      const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${baseUrl}/api/auth&state=nonce`;
      console.log("🔗 Redirecting to", authUrl);
      return res.redirect(authUrl);
    }

    // ✅ 認証コールバック（code がある場合）
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
