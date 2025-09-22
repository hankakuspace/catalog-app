// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import shopify from "@/lib/shopify"; // ← 初期化済みのShopifyオブジェクトをインポート

interface ProductResponse {
  id: string;
  title: string;
  imageUrl: string | null;
  altText: string;
  price: string | null;
  inventory: number | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // リクエストのセッションを取得
    const sessionId = await shopify.session.getCurrentId({
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    if (!sessionId) {
      throw new Error("セッションが見つかりません。OAuth 認証が必要です。");
    }

    const session = await shopify.sessionStorage.loadSession(sessionId);

    if (!session?.accessToken || !session.shop) {
      throw new Error("アクセストークンまたはショップ情報が取得できません。");
    }

    // GraphQL クエリ
    const query = `
      {
        products(first: 10) {
          edges {
            node {
              id
              title
              featuredImage {
                url
                altText
              }
              totalInventory
              variants(first: 1) {
                edges {
                  node {
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Shopify GraphQL API を呼び出す
    const response = await fetch(`https://${session.shop}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": session.accessToken,
      },
      body: JSON.stringify({ query }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} - ${text}`);
    }

    const data = JSON.parse(text);

    const products: ProductResponse[] = data.data.products.edges.map((edge: any) => {
      const variant = edge.node.variants.edges[0]?.node;
      return {
        id: edge.node.id,
        title: edge.node.title,
        imageUrl: edge.node.featuredImage?.url || null,
        altText: edge.node.featuredImage?.altText || "",
        price: variant?.price || null,
        inventory: edge.node.totalInventory ?? null,
      };
    });

    return res.status(200).json(products);
  } catch (err: unknown) {
    console.error("API /products error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
