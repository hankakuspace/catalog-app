// src/lib/shopify.ts
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api";
import { Firestore } from "@google-cloud/firestore";
import { ShopifySessionStorage } from "@shopify/shopify-app-session-storage";

// =======================================
// ✅ Firestore 初期化
// =======================================
const firestore = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

// ✅ Shopify セッションストレージを Firestore で実装
class FirestoreSessionStorageAdapter extends ShopifySessionStorage {
  private collectionName: string;

  constructor(firestore: Firestore, collectionName: string) {
    super(firestore);
    this.collectionName = collectionName;
  }

  getCollection() {
    return firestore.collection(this.collectionName);
  }
}

const sessionStorage = new FirestoreSessionStorageAdapter(
  firestore,
  "shopify_sessions_catalog_app" // Firestoreに生成されるコレクション名
);

// =======================================
// ✅ Shopify API Config
// =======================================
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.July25,
  isEmbeddedApp: true,
  sessionStorage, // Firestoreベースのセッション保存を使用
});

export { shopify, sessionStorage };

// =======================================
// ✅ 補助関数・型
// =======================================
export function getStoreDomain(): string {
  const domain = process.env.SHOPIFY_STORE_DOMAIN || "";
  if (!domain) console.warn("⚠️ SHOPIFY_STORE_DOMAIN が未設定です。");
  return domain;
}
