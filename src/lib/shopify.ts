// src/lib/shopify.ts
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api";
import { FirestoreSessionStorage } from "@shopify/shopify-app-session-storage-firestore";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// =======================================
// ✅ Firebase 初期化（andcollection-private-view 用）
// =======================================
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID, // ← andcollection-private-view
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Firebase インスタンスを初期化
const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(firebaseApp);

// =======================================
// ✅ Shopify App Config
// =======================================
const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecretKey = process.env.SHOPIFY_API_SECRET!;
const appUrl = process.env.SHOPIFY_APP_URL!;
const scopes = process.env.SHOPIFY_SCOPES?.split(",") || [];
const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || "";

// ✅ Firestore セッションストレージを新DBに接続
const sessionStorage = new FirestoreSessionStorage(db, {
  collectionName: "shopify_sessions_catalog_app", // Firestore上のコレクション名
});

// ✅ Shopify API インスタンス生成
const shopify = shopifyApi({
  apiKey,
  apiSecretKey,
  scopes,
  hostName: appUrl.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.July25,
  isEmbeddedApp: true,
  sessionStorage, // ← Firestore連携済みストレージを使用
});

export { shopify, sessionStorage };

// =======================================
// ✅ 補助関数・型
// =======================================
export function getStoreDomain(): string {
  if (!storeDomain) {
    console.warn("⚠️ SHOPIFY_STORE_DOMAIN が未設定です。");
  }
  return storeDomain;
}

// 型定義
interface ProductVariant {
  id: string;
  price: string;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  variants: {
    edges: { node: ProductVariant }[];
  };
  metafields?: {
    edges: {
      node: {
        namespace: string;
        key: string;
        value: string;
      };
    }[];
  };
}

// ✅ Metafields を含めて商品を取得
export async function fetchProducts(session: Session): Promise<Product[]> {
  try {
    const client = new shopify.clients.Graphql({ session });

    const query = `
      {
        products(first: 10) {
          edges {
            node {
              id
              title
              handle
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                  }
                }
              }
              metafields(first: 20) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await client.request<{ products: { edges: { node: Product }[] } }>(query);

    // ✅ dataがundefinedでも落ちないように対策
    const products = response.data?.products?.edges.map((edge) => edge.node) ?? [];

    return products;
  } catch (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }
}
