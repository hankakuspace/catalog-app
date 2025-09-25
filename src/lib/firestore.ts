// src/lib/firestore.ts
import { Session, SessionParams } from "@shopify/shopify-api";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.GCP_PROJECT_ID,
      clientEmail: process.env.GCP_CLIENT_EMAIL,
      privateKey: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const firestore = admin.firestore();
const collection = firestore.collection("shopify_sessions_catalog_app");

export const FirestoreSessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    try {
      await collection.doc(session.id).set(session.toObject());
      return true;
    } catch (err) {
      console.error("❌ Firestore storeSession error:", err);
      return false;
    }
  },

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const doc = await collection.doc(id).get();
      if (!doc.exists) return undefined;

      const data = doc.data() as SessionParams;
      return new Session(data);
    } catch (err) {
      console.error("❌ Firestore loadSession error:", err);
      return undefined;
    }
  },

  async deleteSession(id: string): Promise<boolean> {
    try {
      await collection.doc(id).delete();
      return true;
    } catch (err) {
      console.error("❌ Firestore deleteSession error:", err);
      return false;
    }
  },

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      const batch = firestore.batch();
      ids.forEach((id) => batch.delete(collection.doc(id)));
      await batch.commit();
      return true;
    } catch (err) {
      console.error("❌ Firestore deleteSessions error:", err);
      return false;
    }
  },
};
