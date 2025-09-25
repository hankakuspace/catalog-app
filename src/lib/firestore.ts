// src/lib/firestore.ts
import { Session } from "@shopify/shopify-api";
import { Firestore } from "@google-cloud/firestore";

const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

// ✅ catalog-app 専用コレクション
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
      return new Session(doc.data() as any); // Session に復元
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
