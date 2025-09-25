// src/pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string;

    console.log("🔥 DEBUG auth.begin start", { shop });

    // ✅ rawResponse は渡さない
    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: "/api/auth/callback",
      isOnline: true,
      rawRequest: req, // Nodeのリクエストは必要
    });

    console.log("🔥 DEBUG authRoute:", authRoute);

    // ここで一度だけリダイレクト
    res.redirect(302, authRoute);
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
