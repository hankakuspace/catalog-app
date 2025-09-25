// src/lib/firestore.ts
import { Session } from "@shopify/shopify-api";
import { Firestore } from "@google-cloud/firestore";

const firestore = new Firestore();
const collection = firestore.collection("shopify_sessions");

export const FirestoreSessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    try {
      // Session オブジェクトをシリアライズして保存
      await collection.doc(session.id).set(JSON.parse(JSON.stringify(session)));
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
      return doc.data() as Session;
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
