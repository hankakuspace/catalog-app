// src/pages/api/catalogs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { title, products } = req.body;

      if (!title || !products) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const docRef = await db.collection("catalogs").add({
        title,
        products,
        createdAt: new Date(),
      });

      return res.status(200).json({ id: docRef.id });
    } catch (error: any) {
      console.error("Error saving catalog:", error);
      return res.status(500).json({ error: "Failed to save catalog" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
