// src/lib/firestore.ts
import { Session, sessionFromStorage, sessionToStorage } from "@shopify/shopify-api";
import { Firestore, DocumentData } from "@google-cloud/firestore";

const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

const collection = firestore.collection("shopify_sessions_catalog_app");

export const FirestoreSessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    try {
      const plainObject = sessionToStorage(session); // ✅ 正しくシリアライズ
      await collection.doc(session.id).set(plainObject as DocumentData);
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

      const data = doc.data() as DocumentData;
      return sessionFromStorage(data); // ✅ 復元
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
