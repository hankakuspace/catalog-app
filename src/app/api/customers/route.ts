// src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";
import type { Session } from "@shopify/shopify-api";

type CustomerNode = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type CustomerEdge = {
  node: CustomerNode;
};

export async function GET() {
  try {
    // 🔹 ダミーセッション（開発用）
    const session = {
      id: "dummy_session",
      shop: process.env.SHOPIFY_STORE_DOMAIN!,
      state: "dummy_state",
      isOnline: true,
      accessToken: process.env.SHOPIFY_API_SECRET!,
      scope: "read_customers",
      expires: undefined,
      isActive: () => true,
      onlineAccessInfo: undefined,
    } as unknown as Session; // ✅ 型アサーションで強制

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

    const response = await client.query<{ customers: { edges: CustomerEdge[] } }>({
      data: query,
    });

    const customers = response.body.data.customers.edges.map((e: CustomerEdge) => ({
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
