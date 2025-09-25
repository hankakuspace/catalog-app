// src/pages/api/auth/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";

// ✅ 環境変数から設定を読み込む
const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecretKey = process.env.SHOPIFY_API_SECRET!;
const appUrl = process.env.SHOPIFY_APP_URL!;

const shopify = shopifyApi({
  apiKey,
  apiSecretKey,
  scopes: ["read_products", "write_products"],
  hostName: appUrl.replace(/^https?:\/\//, ""),
  apiVersion: LATEST_API_VERSION,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { shop, hmac, code, state } = req.query as {
      shop: string;
      hmac: string;
      code: string;
      state: string;
    };

    if (!shop || !hmac || !code) {
      return res.status(400).send("Missing required parameters");
    }

    // ✅ HMAC 検証
    const params = { ...req.query };
    delete (params as any).hmac;
    const message = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key as keyof typeof params]}`)
      .join("&");

    const generatedHmac = crypto
      .createHmac("sha256", apiSecretKey)
      .update(message)
      .digest("hex");

    if (generatedHmac !== hmac) {
      return res.status(400).send("HMAC validation failed");
    }

    // ✅ アクセストークンを取得
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: apiKey,
          client_secret: apiSecretKey,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      return res.status(400).send("Failed to get access token");
    }

    const tokenData = await tokenResponse.json();

    // ✅ Cookieに保存（今回は簡易セッション）
    res.setHeader("Set-Cookie", `shopify_token=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`);

    // ✅ exitiframe にリダイレクト
    return res.redirect(`/exitiframe?shop=${shop}`);
  } catch (err: any) {
    console.error("Auth Callback Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}
