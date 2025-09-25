// src/pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import { sessionStorage } from "@/lib/shopify";
import type { Session } from "@shopify/shopify-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "");
  console.warn("⚡️ DEBUG baseUrl (function entry):", baseUrl);

  try {
    console.warn("🔥 DEBUG req.url:", req.url);

    const fullUrl = new URL(req.url || "", "http://dummy");
    const params = fullUrl.searchParams;

    let shop: string | undefined = params.get("shop") || undefined;
    const hostParam = params.get("host") || undefined;
    const code = params.get("code") || undefined;
    const embedded = params.get("embedded");

    // ✅ iframe 内からのアクセスなら exitiframe に誘導
    if (embedded === "1" && shop) {
      const redirectUrl = `https://catalog-app-swart.vercel.app/api/auth?shop=${shop}&host=${hostParam}`;
      console.warn("🔄 Embedded=1, redirecting via exitiframe:", redirectUrl);

      return res.redirect(
        `https://catalog-app-swart.vercel.app/exitiframe?redirectUrl=${encodeURIComponent(
          redirectUrl
        )}`
      );
    }

    // 1. ヘッダから取得
    if (!shop && req.headers["x-shopify-shop-domain"]) {
      shop = req.headers["x-shopify-shop-domain"] as string;
    }

    // 2. Cookie から取得
    if (!shop && req.headers.cookie) {
      const cookies = parse(req.headers.cookie);
      if (cookies["shop"]) shop = cookies["shop"];
    }

    // 3. host パラメータを decode → shop 復元
    if (!shop && hostParam) {
      try {
        const decoded = Buffer.from(hostParam, "base64").toString("utf-8");
        const url = new URL(`https://${decoded}`);
        if (url.hostname.endsWith(".myshopify.com")) {
          shop = url.hostname;
        }
        console.warn("🔥 Decoded shop from host:", shop);
      } catch (e) {
        console.error("❌ Failed to decode host:", hostParam, e);
      }
    }

    if (!shop) {
      console.error("❌ Missing shop parameter. raw params:", Object.fromEntries(params));
      return res.status(400).send("Missing shop parameter");
    }

    const clientId = process.env.SHOPIFY_API_KEY;
    const clientSecret = process.env.SHOPIFY_API_SECRET;
    const scopes = process.env.SHOPIFY_SCOPES;

    if (!clientId || !clientSecret || !scopes) {
      return res.status(500).send("❌ Missing environment variables");
    }

    // ✅ 認証前（codeなし） → OAuth開始
    if (!code) {
      const installUrl =
        `https://${shop}/admin/oauth/authorize?` +
        new URLSearchParams({
          client_id: clientId,
          scope: scopes,
          // ✅ 埋め込み管理画面に戻さず、必ず自分のアプリのURLへ返す
          redirect_uri: "https://catalog-app-swart.vercel.app/api/auth",
        }).toString();

      console.warn("🔥 Begin OAuth flow", { shop, installUrl });
      return res.redirect(installUrl);
    }

    // ✅ 認証コールバック（codeあり）
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
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
      scope: scopes,
      accessToken: data.access_token,
      expires: null,
      onlineAccessInfo: null,
    };

    await sessionStorage.storeSession(session as unknown as Session);

    console.warn("✅ OAuth success (manual)", { shop, hostParam });

    // ✅ AppBridge Redirect を使って埋め込みに戻す（絶対URL指定）
    return res.send(`
      <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
      <script>
        var AppBridge = window['app-bridge'];
        var createApp = AppBridge.default;
        var Redirect = AppBridge.actions.Redirect;

        console.log("🔥 DEBUG hostParam in client:", "${hostParam}");

        var app = createApp({
          apiKey: "${process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}",
          host: "${hostParam}"
        });

        var redirect = Redirect.create(app);
        redirect.dispatch(
          Redirect.Action.APP,
          "https://catalog-app-swart.vercel.app/admin/dashboard"
        );
      </script>
    `);
  } catch (err) {
    const error = err as Error;
    console.error("❌ Auth error:", error);
    return res.status(500).send("OAuth Callback Error: " + error.message);
  }
}
