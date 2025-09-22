// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";

export async function GET() {
  try {
    // 仮セッション（OAuth導入前）
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
    const products = response.body?.data?.products?.edges?.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      handle: e.node.handle,
      price: e.node.variants.edges[0]?.node?.price || null,
    })) ?? [];

    return NextResponse.json(products);
  } catch (error) {
    console.error("❌ Products API error:", error);
    return NextResponse.json({ error: "商品取得に失敗しました" }, { status: 500 });
  }
}
