// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const shop = process.env.SHOPIFY_SHOP!;
    const token = process.env.SHOPIFY_ACCESS_TOKEN!;

    if (!shop || !token) {
      throw new Error("環境変数 SHOPIFY_SHOP / SHOPIFY_ACCESS_TOKEN が未設定です");
    }

    const query = `
      {
        products(first: 20) {
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
                    priceV2 {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} - ${text}`);
    }

    const data = JSON.parse(text);

    const products = data.data.products.edges.map((edge: any) => {
      const variant = edge.node.variants.edges[0]?.node;
      const price =
        variant?.priceV2?.amount && variant?.priceV2?.currencyCode
          ? `${variant.priceV2.amount} ${variant.priceV2.currencyCode}`
          : variant?.price || null;

      return {
        id: edge.node.id,
        title: edge.node.title,
        imageUrl: edge.node.featuredImage?.url || null,
        altText: edge.node.featuredImage?.altText || "",
        price,
        inventory: edge.node.totalInventory ?? null,
      };
    });

    return res.status(200).json(products);
  } catch (err: any) {
    console.error("API /products error:", err);
    return res.status(500).json({ error: err.message });
  }
}
