// src/lib/shopify.ts
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api";
import { FirestoreSessionStorage } from "@/lib/firestore";

const apiKey = process.env.SHOPIFY_API_KEY!;
const apiSecretKey = process.env.SHOPIFY_API_SECRET!;
const appUrl = process.env.SHOPIFY_APP_URL!;
const scopes = process.env.SHOPIFY_SCOPES?.split(",") || [];
const storeDomain = process.env.SHOPIFY_STORE_DOMAIN || "";

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
}

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
            }
          }
        }
      }
    `;

    // ✅ v12: request() は string を直接受け取る
    const response = await client.request(query);

    const products =
      response.body.data?.products?.edges.map((edge: { node: Product }) => edge.node) ?? [];

    return products;
  } catch (error) {
    console.error("❌ fetchProducts error:", error);
    throw error;
  }
}
