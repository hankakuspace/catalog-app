// src/pages/api/products/sync.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { syncProductIndex } from "@/lib/productIndexSync";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const shop =
      typeof req.query.shop === "string"
        ? req.query.shop
        : typeof req.body?.shop === "string"
        ? req.body.shop
        : "";

    if (!shop) {
      return res.status(400).json({ error: "Missing shop" });
    }

    const result = await syncProductIndex(shop);

    return res.status(200).json({
      ok: true,
      count: result.count,
    });
  } catch (err) {
    console.error("❌ product sync error:", err);

    if (err instanceof Error) {
      if (err.message === "Unauthorized") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      return res.status(500).json({ error: err.message });
    }

    return res.status(500).json({ error: String(err) });
  }
}
