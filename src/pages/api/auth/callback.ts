// src/pages/api/auth/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";

export const config = {
  runtime: "nodejs",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { session } = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    // 🔥 offline session をそのまま保存
    await sessionStorage.storeSession(session);

    const host = req.query.host as string;

    return res.redirect(
      `/exitiframe?shop=${encodeURIComponent(
        session.shop
      )}&host=${encodeURIComponent(host)}`
    );
  } catch (error) {
    console.error("❌ Auth callback error:", error);
    return res.status(500).send("OAuth callback failed");
  }
}
