// src/lib/shopify.ts
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

// ✅ 環境変数を読み込み
const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecretKey = process.env.SHOPIFY_API_SECRET!;
const appUrl = process.env.SHOPIFY_APP_URL!;
const scopes = process.env.SHOPIFY_SCOPES?.split(",") || [];
const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || "";

// ✅ Shopify API クライアントを初期化
export const shopify = shopifyApi({
  apiKey,
  apiSecretKey,
  scopes,
  hostName: appUrl.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.July25, // 最新安定版
  isEmbeddedApp: true,
});

// ✅ ストアドメインを返す（未設定なら警告）
export function getStoreDomain(): string {
  if (!storeDomain) {
    console.warn("⚠️ SHOPIFY_STORE_DOMAIN が未設定です。");
  }
  return storeDomain;
}

// ✅ サンプル: Products API を使って商品一覧を取得
export async function fetchProducts(session: any) {
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
            }
          }
        }
      }
    `;

    const response = await client.query({ data: query });
    return response.body.data.products.edges.map((edge: any) => edge.node);
  } catch (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }
}
