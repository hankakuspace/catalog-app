// src/pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import { URL } from "url";
import { sessionStorage } from "@/lib/shopify";
import type { Session } from "@shopify/shopify-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.warn("🔥 DEBUG req.url:", req.url);

    // ✅ req.url を直接パースしてクエリを取得
    const fullUrl = new URL(req.url || "", `https://${req.headers.host}`);
    const params = fullUrl.searchParams;

    let shop: string | undefined = params.get("shop") || undefined;
    const hostParam = params.get("host") || undefined;
    const code = params.get("code") || undefined;

    // 2. ヘッダから取得
    if (!shop && req.headers["x-shopify-shop-domain"]) {
      shop = req.headers["x-shopify-shop-domain"] as string;
    }

    // 3. Cookie から取得
    if (!shop && req.headers.cookie) {
      const cookies = parse(req.headers.cookie);
      if (cookies["shop"]) shop = cookies["shop"];
    }

    // 4. host パラメータを decode
    if (!shop && hostParam) {
      try {
        const decoded = Buffer.from(hostParam, "base64").toString("utf-8");
        shop = decoded.split("/")[0];
        console.log("🔥 Decoded shop from host:", shop);
      } catch (e) {
        console.error("❌ Failed to decode host:", hostParam, e);
      }
    }

    if (!shop) {
      console.error("❌ Missing shop parameter. raw params:", Object.fromEntries(params));
      return res.status(400).send("Missing shop parameter");
    }

    const baseUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "";

    // ✅ 認証前（codeなし）
    if (!code) {
      const redirectUrl = `${baseUrl}/api/auth?shop=${shop}`;
      console.log("🔥 Custom Reauthorize", { shop, redirectUrl });

      return res
        .status(401)
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1")
        .setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl)
        .send("");
    }

    // ✅ 認証コールバック
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
  } catch (err) {
    const error = err as Error;
    console.error("❌ Auth error:", error);
    return res.status(500).send("OAuth Callback Error: " + error.message);
  }
}
