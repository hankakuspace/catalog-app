// src/lib/shopify.ts
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api"; // ✅ Session を import
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

export async function fetchProducts(session: Session) {
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

    const response = await client.query<{ products: { edges: { node: unknown }[] } }>({
      data: query,
    });

    return response?.body?.data?.products?.edges?.map((edge) => edge.node) ?? [];
  } catch (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }
}
