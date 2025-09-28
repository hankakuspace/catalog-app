// src/pages/api/catalogs/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebase } from "@/lib/firebase";

initFirebase();
const db = getFirestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const snapshot = await db.collection("shopify_catalogs_app").orderBy("createdAt", "desc").get();

    const catalogs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ catalogs });
  } catch (error) {
    console.error("Error fetching catalogs:", error);
    return res.status(500).json({ error: "Failed to fetch catalogs" });
  }
}
