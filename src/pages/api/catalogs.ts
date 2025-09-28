// src/pages/api/catalogs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbAdmin, FieldValue } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { title, products } = req.body;
      if (!title || !products) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const docRef = await dbAdmin.collection("shopify_catalogs_app").add({
        title,
        products,
        createdAt: FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ id: docRef.id });
    } catch (err) {
      console.error("❌ Error saving catalog:", err);
      return res.status(500).json({ error: "Failed to save catalog" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
