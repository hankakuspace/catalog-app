// src/pages/api/catalogs/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminShop, ownsCatalog, managementCatalog } from "@/lib/shopify";
import { dbAdmin } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const shop = await requireAdminShop(req, res);
  if (!shop) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const snap = await dbAdmin.collection("shopify_catalogs_app").doc(id).get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Not found" });
    }

    if (!ownsCatalog(snap.data(), shop)) return res.status(403).json({ error: "Forbidden" });
    return res.status(200).json({
      catalog: {
        id: snap.id,
        ...managementCatalog(snap.data()!),
      },
    });
  } catch {
    console.error("Catalog API failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}
