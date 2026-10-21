// src/pages/api/catalogs/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminShop, ownsCatalog } from "@/lib/shopify";
import { dbAdmin } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const shop = await requireAdminShop(req, res);
  if (!shop) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No IDs provided" });
    }

    if (ids.length > 500 || !ids.every((id: unknown) => typeof id === "string" && id && !id.includes("/"))) return res.status(400).json({ error: "Invalid ids" });
    const deleted = await dbAdmin.runTransaction(async (transaction) => {
      const refs = ids.map((id: string) => dbAdmin.collection("shopify_catalogs_app").doc(id));
      const snaps = await transaction.getAll(...refs);
      if (snaps.some((snap) => !ownsCatalog(snap.data(), shop))) return false;
      refs.forEach((ref: FirebaseFirestore.DocumentReference) => transaction.delete(ref));
      return true;
    });
    if (!deleted) return res.status(403).json({ error: "Forbidden" });

    return res.status(200).json({ success: true, deleted: ids });
  } catch {
    console.error("Catalog API failed");
    return res.status(500).json({ error: "Failed to delete catalogs" });
  }
}
