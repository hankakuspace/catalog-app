// src/pages/api/catalogs/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbAdmin } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No IDs provided" });
    }

    const batch = dbAdmin.batch();
    ids.forEach((id: string) => {
      const ref = dbAdmin.collection("shopify_catalogs_app").doc(id);
      batch.delete(ref);
    });
    await batch.commit();

    return res.status(200).json({ success: true, deleted: ids });
  } catch (err) {
    console.error("❌ Error deleting catalogs:", err);
    return res.status(500).json({ error: "Failed to delete catalogs" });
  }
}
