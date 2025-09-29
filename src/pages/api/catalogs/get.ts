// src/pages/api/catalogs/get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbAdmin } from "@/lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const snap = await dbAdmin.collection("shopify_catalogs_app").doc(id).get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json({
      id: snap.id,
      ...snap.data(),
    });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
