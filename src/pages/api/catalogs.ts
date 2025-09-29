// src/pages/api/catalogs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbAdmin, FieldValue } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { id } = req.query;
      if (id) {
        const doc = await dbAdmin.collection("shopify_catalogs_app").doc(String(id)).get();
        if (!doc.exists) return res.status(404).json({ error: "Not found" });
        return res.status(200).json({ catalog: { id: doc.id, ...doc.data() } });
      }
      const snapshot = await dbAdmin.collection("shopify_catalogs_app")
        .orderBy("createdAt", "desc")
        .get();
      const catalogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.status(200).json({ catalogs });
    }

    if (req.method === "POST") {
      const { title, products, shop } = req.body;
      if (!title || !products || !shop) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const docRef = dbAdmin.collection("shopify_catalogs_app").doc();
      const baseUrl = process.env.SHOPIFY_APP_URL;
      if (!baseUrl) throw new Error("SHOPIFY_APP_URL is not defined");

      const previewUrl = `${baseUrl}/preview/${docRef.id}`;
      await docRef.set({
        title,
        products,
        shop,
        createdAt: FieldValue.serverTimestamp(),
        previewUrl,
      });

      return res.status(200).json({ id: docRef.id, previewUrl });
    }

    if (req.method === "PUT") {
      const { id, title, products } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });

      await dbAdmin.collection("shopify_catalogs_app").doc(id).update({
        title,
        products,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("❌ API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
