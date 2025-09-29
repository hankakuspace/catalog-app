// src/pages/api/catalogs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbAdmin, FieldValue } from "@/lib/firebaseAdmin";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { title, products, shop } = req.body;
      if (!title || !products || !shop) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // ✅ セッション確認
      const sessionId = shopify.session.getOfflineId(shop);
      const session = await sessionStorage.loadSession(sessionId);

      if (!session || !session.accessToken) {
        return res.status(401).json({ error: "No active Shopify session" });
      }

      // ✅ Firestore に保存
      const docRef = dbAdmin.collection("shopify_catalogs_app").doc();

      // ✅ baseUrl を SHOPIFY_APP_URL に統一
      const baseUrl = process.env.SHOPIFY_APP_URL;
      if (!baseUrl) {
        console.error("❌ SHOPIFY_APP_URL is not defined");
        throw new Error("SHOPIFY_APP_URL is not defined");
      }

      const previewUrl = `${baseUrl}/preview/${docRef.id}`;

      // 🔎 ログ出力（確認用）
      console.log("📌 Saving catalog:", {
        shop,
        title,
        productsCount: Array.isArray(products) ? products.length : 0,
        baseUrl,
        docId: docRef.id,
        previewUrl,
      });

      await docRef.set({
        title,
        products,
        createdAt: FieldValue.serverTimestamp(),
        previewUrl,
      });

      console.log("✅ Catalog saved:", { id: docRef.id, previewUrl });

      return res.status(200).json({ id: docRef.id, previewUrl });
    } catch (err) {
      console.error("❌ Error saving catalog:", err);
      return res.status(500).json({ error: "Failed to save catalog" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
