// src/lib/shopify.ts
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api";
import { FirestoreSessionStorage } from "@/lib/firestore";

const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecretKey = process.env.SHOPIFY_API_SECRET!;
const appUrl = process.env.SHOPIFY_APP_URL!;
const scopes = process.env.SHOPIFY_SCOPES?.split(",") || [];
const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || "";

// ✅ Firestore セッションストレージを使用
const sessionStorage = FirestoreSessionStorage;

const shopify = shopifyApi({
  apiKey,
  apiSecretKey,
  scopes,
  hostName: appUrl.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.July25,
  isEmbeddedApp: true,
  sessionStorage,
});

export { shopify, sessionStorage };

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

    // ✅ 型エラー対策: data が undefined の場合は空配列を返す
    const products = response.data?.products?.edges.map((edge) => edge.node) ?? [];

    return products;
  } catch (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }
}
