// src/pages/api/auth/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string;

    if (!shop) {
      res.status(400).send("Missing shop parameter");
      return;
    }

    // ✅ 既存セッション確認
    const sessionId = await shopify.session.getCurrentId({
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    const session = sessionId
      ? await shopify.config.sessionStorage.loadSession(sessionId)
      : null;

    // ✅ iframe 内から呼ばれた場合
    if (req.query.embedded === "1") {
      if (session && session.accessToken) {
        console.log("✅ Existing session found, redirecting to /admin");
        res.writeHead(302, { Location: "/admin" });
        res.end();
        return;
      }

      const redirectUrl = `${process.env.SHOPIFY_APP_URL}/api/auth?shop=${shop}`;
      console.log("🔄 Sending Reauthorize headers:", redirectUrl);

      res.setHeader("X-Shopify-API-Request-Failure-Reauthorize", "1");
      res.setHeader("X-Shopify-API-Request-Failure-Reauthorize-Url", redirectUrl);
      res.status(401).end();
      return;
    }

    // ✅ 通常の OAuth 開始フロー
    // Shopify SDK が自動でレスポンスを書いてくれるので、二重で redirect しない
    await shopify.auth.begin({
      shop,
      callbackPath: "/api/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    return; // 🔴 ここで終了
  } catch (err: unknown) {
    console.error("❌ /api/auth error:", err);
    if (!res.writableEnded) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}
