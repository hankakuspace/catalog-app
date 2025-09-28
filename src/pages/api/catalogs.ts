// src/pages/api/catalogs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbAdmin, FieldValue } from "@/lib/firebaseAdmin";
import { shopify, sessionStorage } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { title, products, shop } = req.body; // 👈 フロントから shop を渡してもらう
      if (!title || !products || !shop) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // ✅ セッションを取得
      const sessionId = shopify.session.getOfflineId(shop);
      const session = await sessionStorage.loadSession(sessionId);

      if (!session || !session.accessToken) {
        return res.status(401).json({ error: "No active Shopify session" });
      }

      // ✅ Shopify Users API から現在のユーザーを取得
      const response = await fetch(`https://${shop}/admin/api/2023-04/users/current.json`, {
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("❌ Failed to fetch Shopify user:", await response.text());
        return res.status(500).json({ error: "Failed to fetch user info" });
      }

      const data = await response.json();
      const createdBy = data?.user
        ? `${data.user.first_name} ${data.user.last_name}`
        : "Unknown";

      // ✅ Firestore に保存
      const docRef = dbAdmin.collection("shopify_catalogs_app").doc();
      const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/preview/${docRef.id}`;

      await docRef.set({
        title,
        products,
        createdAt: FieldValue.serverTimestamp(),
        createdBy,
        previewUrl,
      });

      return res.status(200).json({ id: docRef.id, previewUrl, createdBy });
    } catch (err) {
      console.error("❌ Error saving catalog:", err);
      return res.status(500).json({ error: "Failed to save catalog" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
