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

      // ✅ セッション確認だけ行う（アクセストークン存在チェック）
      const sessionId = shopify.session.getOfflineId(shop);
      const session = await sessionStorage.loadSession(sessionId);

      if (!session || !session.accessToken) {
        return res.status(401).json({ error: "No active Shopify session" });
      }

      // ✅ Firestore に保存
      const docRef = dbAdmin.collection("shopify_catalogs_app").doc();
      const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/preview/${docRef.id}`;

      await docRef.set({
        title,
        products,
        createdAt: FieldValue.serverTimestamp(),
        previewUrl,
      });

      return res.status(200).json({ id: docRef.id, previewUrl });
    } catch (err) {
      console.error("❌ Error saving catalog:", err);
      return res.status(500).json({ error: "Failed to save catalog" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
