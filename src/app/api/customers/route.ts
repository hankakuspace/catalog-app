// src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";

export async function GET() {
  try {
    const session = {
      // 🔹 dev段階なので仮のセッション扱い（本来はOAuthで取得）
      shop: process.env.SHOPIFY_STORE_DOMAIN!,
      accessToken: process.env.SHOPIFY_API_SECRET!,
    };

    const client = new shopify.clients.Graphql({ session });

    const query = `
      {
        customers(first: 10) {
          edges {
            node {
              id
              email
              firstName
              lastName
            }
          }
        }
      }
    `;

    const response = await client.query({ data: query });
    const customers = response.body.data.customers.edges.map((e: any) => ({
      id: e.node.id,
      email: e.node.email,
      firstName: e.node.firstName,
      lastName: e.node.lastName,
    }));

    return NextResponse.json(customers);
  } catch (error) {
    console.error("❌ Customers API error:", error);
    return NextResponse.json({ error: "顧客取得に失敗しました" }, { status: 500 });
  }
}
