// src/pages/api/catalogs/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminShop } from "@/lib/shopify";
import { dbAdmin } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const shop = await requireAdminShop(req, res);
  if (!shop) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const snapshot = await dbAdmin
      .collection("shopify_catalogs_app")
      .where("shop", "==", shop)
      .get();

    const catalogs = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title || "",
        previewUrl: data.previewUrl || null,
        // ✅ Timestamp を ISO 文字列に変換
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        products: data.products || [],
      };
    });

    catalogs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return res.status(200).json({ catalogs });
  } catch {
    console.error("Catalog API failed");
    return res.status(500).json({ error: "Failed to fetch catalogs" });
  }
}
