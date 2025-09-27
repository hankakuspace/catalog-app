// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";
import { GraphQLClient, gql } from "graphql-request";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string | undefined;

    // 1. Firestore からオフラインセッションをロード
    let session = shop ? await sessionStorage.loadSession(`offline_${shop}`) : null;

    // 2. オンラインセッションのフォールバック
    if (!session) {
      const sessionId = await shopify.session.getCurrentId({
        isOnline: true,
        rawRequest: req,
        rawResponse: res,
      });
      session = sessionId ? await sessionStorage.loadSession(sessionId) : null;
    }

    if (!session) {
      console.error("❌ セッションが見つからない", { shop });
      return res.status(401).json({ error: "Unauthorized: セッションがロードできません" });
    }

    console.log("🔥 Debug /api/products:", {
      id: session.id,
      shop: session.shop,
      accessToken: session.accessToken ? "存在する" : "なし",
    });

    // GraphQL クエリに vendor と images を追加
    const client = new GraphQLClient(`https://${session.shop}/admin/api/2025-01/graphql.json`, {
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
      },
    });

    const query = gql`
      {
        products(first: 50) {
          edges {
            node {
              id
              title
              vendor
              images(first: 1) {
                edges {
                  node {
                    originalSrc
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
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

    const data = await client.request(query);

    // 整形
    const formatted = data.products.edges.map((edge: any) => {
      const p = edge.node;

      const metafields: Record<string, string> = {};
      p.metafields?.edges.forEach((edge: any) => {
        const { key, value } = edge.node;
        metafields[key] = value;
      });

      return {
        id: p.id,
        title: p.title,
        artist: p.vendor, // ✅ 作家名
        imageUrl: p.images.edges[0]?.node.originalSrc || null, // ✅ サムネイル
        price: p.variants?.edges[0]?.node?.price || "0.00",
        year: metafields["year"] || "",
        credit: metafields["credit"] || "",
        type: metafields["type"] || "",
        importance: metafields["importance"] || "",
        edition: metafields["edition"] || "",
        signed: metafields["signed"] || "",
        dimensions: metafields["dimensions"] || "",
        medium: metafields["medium"] || "",
        frame: metafields["frame"] || "",
      };
    });

    return res.status(200).json({ products: formatted });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ /api/products エラー詳細:", error);
    return res.status(500).json({ error: error.message });
  }
}
