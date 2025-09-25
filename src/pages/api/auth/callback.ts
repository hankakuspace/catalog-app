// src/pages/api/auth/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecretKey = process.env.SHOPIFY_API_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { shop, hmac, code, host } = req.query as {
      shop: string;
      hmac: string;
      code: string;
      host: string;
    };

    if (!shop || !hmac || !code || !host) {
      return res.status(400).send("Missing required parameters");
    }

    // ✅ HMAC 検証
    const params: Record<string, string | string[]> = { ...req.query };
    delete params.hmac;
    const message = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
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

    type TokenResponse = {
      access_token: string;
      scope: string;
    };

    const tokenData: TokenResponse = await tokenResponse.json();

    // ✅ Cookieに保存（簡易セッション）
    res.setHeader(
      "Set-Cookie",
      `shopify_token=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`
    );

    // ✅ exitiframe にリダイレクト（host と shop を必ず渡す）
    return res.redirect(
      `/exitiframe?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`
    );
  } catch (err) {
    console.error("Auth Callback Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}
