// src/pages/api/webhooks/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { syncProductIndex } from "@/lib/productIndexSync";

export const config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

function getWebhookSecret(): string {
  const secret =
    process.env.SHOPIFY_API_SECRET ||
    process.env.SHOPIFY_API_SECRET_KEY ||
    process.env.SHOPIFY_CLIENT_SECRET ||
    "";

  if (!secret) {
    throw new Error("Shopify webhook secret is not defined");
  }

  return secret;
}

function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string | undefined) {
  if (!hmacHeader) {
    return false;
  }

  const secret = getWebhookSecret();
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const digestBuffer = Buffer.from(digest, "utf8");
  const hmacBuffer = Buffer.from(hmacHeader, "utf8");

  if (digestBuffer.length !== hmacBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, hmacBuffer);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const rawBody = await getRawBody(req);
    const hmac = req.headers["x-shopify-hmac-sha256"];
    const topic = req.headers["x-shopify-topic"];
    const shop = req.headers["x-shopify-shop-domain"];

    const hmacHeader = Array.isArray(hmac) ? hmac[0] : hmac;
    const topicHeader = Array.isArray(topic) ? topic[0] : topic;
    const shopDomain = Array.isArray(shop) ? shop[0] : shop;

    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    if (!shopDomain) {
      return res.status(400).json({ error: "Missing shop domain" });
    }

    if (
      topicHeader !== "products/create" &&
      topicHeader !== "products/update" &&
      topicHeader !== "products/delete"
    ) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const result = await syncProductIndex(shopDomain);

    return res.status(200).json({
      ok: true,
      topic: topicHeader,
      shop: shopDomain,
      count: result.count,
    });
  } catch (err) {
    console.error("❌ product webhook error:", err);

    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(500).json({ error: String(err) });
  }
}
