// src/pages/api/auth/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { shopify, sessionStorage } from "@/lib/shopify";
import { Session } from "@shopify/shopify-api"; // ✅ 直接 import

const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecretKey = process.env.SHOPIFY_API_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { shop, hmac, code, host } = req.query as {
      shop?: string;
      hmac?: string;
      code?: string;
      host?: string;
    };

    if (!shop || !hmac || !code || !host) {
      return res.status(400).send("Missing required parameters");
    }

    // ✅ HMAC 検証
    const queryEntries = Object.entries(req.query)
      .filter(([key]) => key !== "hmac")
      .map(([key, value]) => {
        const val = Array.isArray(value) ? value.join(",") : value ?? "";
        return [key, val];
      });

    const message = queryEntries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${val}`)
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

    // ✅ 正しい offline セッションID を生成
    const offlineId = shopify.session.getOfflineId(shop);

    // ✅ セッションを作成
    const offlineSession = new Session({
      id: offlineId,
      shop,
      isOnline: false,
      state: "offline",
    });
    offlineSession.accessToken = tokenData.access_token;

    await sessionStorage.storeSession(offlineSession);

    console.log("🔥 Session stored:", {
      id: offlineSession.id,
      shop: offlineSession.shop,
      accessToken: offlineSession.accessToken ? "存在する" : "なし",
    });

    // ✅ exitiframe にリダイレクト
    return res.redirect(
      `/exitiframe?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`
    );
  } catch (err) {
    console.error("Auth Callback Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}
