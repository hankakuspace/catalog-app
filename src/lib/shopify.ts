// src/lib/shopify.ts

console.log("🔥 Firebase ENV:", {
  project: process.env.FIREBASE_PROJECT_ID,
  client: process.env.FIREBASE_CLIENT_EMAIL,
  privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length,
});

import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { Firestore } from "@google-cloud/firestore";
import { SessionStorage } from "@shopify/shopify-app-session-storage";

// =======================================
// 🔥 Firestore 初期化（admin SDK と同じ認証情報を使用）
// =======================================
const firestore = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

console.log(
  "✅ Firestore Initialized with Project:",
  process.env.FIREBASE_PROJECT_ID,
);

// =======================================
// ✅ Shopify セッション保存用：Firestore保存可能なplain objectへ変換
// =======================================
function serializeSession(session: any) {
  const plainSession =
    typeof session.toObject === "function"
      ? session.toObject()
      : {
          id: session.id,
          shop: session.shop,
          state: session.state,
          isOnline: session.isOnline,
          scope: session.scope,
          accessToken: session.accessToken,
          expires: session.expires,
          onlineAccessInfo: session.onlineAccessInfo,
        };

  return JSON.parse(JSON.stringify(plainSession));
}

// =======================================
// ✅ Shopify セッションストレージ Firestore 実装
// =======================================

class FirestoreSessionStorageAdapter implements SessionStorage {
  private collectionName: string;

  constructor(
    private firestore: Firestore,
    collectionName: string,
  ) {
    this.collectionName = collectionName;
  }

  async storeSession(session: any): Promise<boolean> {
    const plainSession = serializeSession(session);

    await this.firestore
      .collection(this.collectionName)
      .doc(plainSession.id)
      .set(plainSession);

    console.log("🔥 Firestore storeSession success:", plainSession.id);

    return true;
  }

  async loadSession(id: string): Promise<any | undefined> {
    const doc = await this.firestore
      .collection(this.collectionName)
      .doc(id)
      .get();
    return doc.exists ? doc.data() : undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    await this.firestore.collection(this.collectionName).doc(id).delete();
    return true;
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    const batch = this.firestore.batch();

    ids.forEach((id) =>
      batch.delete(this.firestore.collection(this.collectionName).doc(id)),
    );

    await batch.commit();

    return true;
  }

  async findSessionsByShop(shop: string): Promise<any[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where("shop", "==", shop)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }
}

const sessionStorage = new FirestoreSessionStorageAdapter(
  firestore,
  "shopify_sessions_catalog_app",
);

// =======================================
// ✅ Shopify API 設定
// =======================================
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: "catalog-app-swart.vercel.app",
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
  sessionStorage,
});

export { shopify, sessionStorage };
