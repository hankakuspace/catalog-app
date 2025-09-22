// src/lib/shopify.ts
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { MemorySessionStorage } from "@shopify/shopify-api/dist/session-storage/memory";

const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecretKey = process.env.SHOPIFY_API_SECRET!;
const appUrl = process.env.SHOPIFY_APP_URL!;
const scopes = process.env.SHOPIFY_SCOPES?.split(",") || [];
const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || "";

// ✅ セッションストレージを追加
export const shopify = shopifyApi({
  apiKey,
  apiSecretKey,
  scopes,
  hostName: appUrl.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.July25,
  isEmbeddedApp: true,
  sessionStorage: new MemorySessionStorage(),
});

export function getStoreDomain(): string {
  if (!storeDomain) {
    console.warn("⚠️ SHOPIFY_STORE_DOMAIN が未設定です。");
  }
  return storeDomain;
}

// ✅ 型エラー回避しつつ商品取得
export async function fetchProducts(session: unknown) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = new shopify.clients.Graphql({ session: session as any });

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await client.query({ data: query });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response?.body?.data?.products?.edges?.map((edge: any) => edge.node) ?? [];
  } catch (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }
}
