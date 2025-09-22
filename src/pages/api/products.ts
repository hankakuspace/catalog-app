// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify } from "@/lib/shopify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const session = {
      shop: process.env.SHOPIFY_STORE_DOMAIN!,
      accessToken: process.env.SHOPIFY_API_SECRET!,
    };

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
    const products = response?.body?.data?.products?.edges?.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      handle: e.node.handle,
      price: e.node.variants.edges[0]?.node?.price || null,
    })) ?? [];

    res.status(200).json(products);
  } catch (error) {
    console.error("❌ Products API error:", error);
    res.status(500).json({ error: "商品取得に失敗しました" });
  }
}
