// src/pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string;

    console.log("🔥 DEBUG auth.begin start", {
      shop,
      appUrl: process.env.SHOPIFY_APP_URL,
      apiKey: process.env.SHOPIFY_API_KEY,
      scopes: process.env.SHOPIFY_SCOPES,
    });

    // URLを取得
    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: "/api/auth/callback",
      isOnline: true,
      rawRequest: req,
      rawResponse: res,
    });

    console.log("🔥 DEBUG authRoute:", authRoute);

    // 明示的にリダイレクト（write after endを避ける）
    res.writeHead(302, { Location: authRoute });
    res.end();
  } catch (error) {
    console.error("❌ Auth begin error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Auth begin failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
