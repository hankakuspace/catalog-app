// src/app/api/products/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const shop = process.env.SHOPIFY_SHOP!;
    const token = process.env.SHOPIFY_ACCESS_TOKEN!;

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

    const data = await response.json();
    const products = data.data.products.edges.map((edge: any) => {
      const variant = edge.node.variants.edges[0]?.node;
      return {
        id: edge.node.id,
        title: edge.node.title,
        imageUrl: edge.node.featuredImage?.url || null,
        altText: edge.node.featuredImage?.altText || "",
        price: variant?.price || "不明",
        inventory: edge.node.totalInventory ?? null,
      };
    });

    return NextResponse.json(products);
  } catch (err: any) {
    console.error("API /products error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
