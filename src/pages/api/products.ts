// src/lib/shopify.ts
import { shopifyApi, LATEST_API_VERSION, Session } from "@shopify/shopify-api";
import { FirestoreSessionStorage } from "@/lib/firestore";

// ✅ Shopify API 初期化
export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  apiVersion: LATEST_API_VERSION,
  sessionStorage: FirestoreSessionStorage,
});

// ✅ Firestore 経由でセッションストレージを利用
export const sessionStorage = FirestoreSessionStorage;

// ✅ 最新版の fetchProducts 実装
export async function fetchProducts(session: Session) {
  try {
    const client = new shopify.clients.Rest({ session });

    const response = await client.get({
      path: "products",
    });

    console.log("🔥 fetchProducts response:", {
      status: response.status,
      headers: response.headers,
    });

    return response.body; // v12以降はここにデータが入る
  } catch (err) {
    console.error("❌ fetchProducts error:", err);
    throw err;
  }
}
