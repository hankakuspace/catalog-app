// src/lib/shopify.ts
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { Firestore } from "@google-cloud/firestore";
import { SessionStorage } from "@shopify/shopify-app-session-storage";

// =======================================
// ✅ Firestore 初期化
// =======================================
const firestore = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

// ✅ Shopify セッションストレージを Firestore で実装
class FirestoreSessionStorageAdapter extends SessionStorage {
  private collectionName: string;

  constructor(firestore: Firestore, collectionName: string) {
    super();
    this.collectionName = collectionName;
  }

  async storeSession(session: any): Promise<boolean> {
    await firestore.collection(this.collectionName).doc(session.id).set(session);
    return true;
  }

  async loadSession(id: string): Promise<any | undefined> {
    const doc = await firestore.collection(this.collectionName).doc(id).get();
    return doc.exists ? doc.data() : undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    await firestore.collection(this.collectionName).doc(id).delete();
    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    const batch = firestore.batch();
    ids.forEach((id) => batch.delete(firestore.collection(this.collectionName).doc(id)));
    await batch.commit();
    return true;
  }

  async findSessionsByShop(shop: string): Promise<any[]> {
    const snapshot = await firestore
      .collection(this.collectionName)
      .where("shop", "==", shop)
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}

const sessionStorage = new FirestoreSessionStorageAdapter(
  firestore,
  "shopify_sessions_catalog_app" // Firestoreコレクション名
);

// =======================================
// ✅ Shopify API 設定
// =======================================
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.July25,
  isEmbeddedApp: true,
  sessionStorage,
});

export { shopify, sessionStorage };
