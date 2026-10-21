// src/pages/api/products/sync.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminShop, sessionStorage } from "@/lib/shopify";
import { syncProductIndex } from "@/lib/productIndexSync";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = await requireAdminShop(req, res);
    if (!shop) return;
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }


    const session = await sessionStorage.loadSession(`offline_${shop}`);
    if (!session?.accessToken) return res.status(401).json({ error: "Unauthorized" });
    if (session.shop !== shop) return res.status(403).json({ error: "Forbidden" });
    const result = await syncProductIndex(shop);

    return res.status(200).json({
      ok: true,
      count: result.count,
    });
  } catch {
    console.error("Product sync failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}
