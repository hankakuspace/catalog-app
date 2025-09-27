// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";
import { GraphQLClient, gql } from "graphql-request";

interface ProductNode {
  id: string;
  title: string;
  vendor: string;
  images: {
    edges: { node: { originalSrc: string } }[];
  };
  variants: {
    edges: { node: { price: string } }[];
  };
  metafields: {
    edges: { node: { namespace: string; key: string; value: string } }[];
  };
}

interface ProductEdge {
  node: ProductNode;
}

interface GraphQLResponse {
  products: {
    edges: ProductEdge[];
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string | undefined;
    const search = (req.query.query as string) || ""; // 検索ワード

    // Firestore からオフラインセッションをロード
    let session = shop ? await sessionStorage.loadSession(`offline_${shop}`) : null;

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

    const client = new GraphQLClient(
      `https://${session.shop}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          "X-Shopify-Access-Token": session.accessToken!,
        },
      }
    );

    // ✅ GraphQL 側では全件取得
    const gqlQuery = gql`
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

    const data = await client.request<GraphQLResponse>(gqlQuery);

    // 整形
    let formatted = data.products.edges.map((edge) => {
      const p = edge.node;

      const metafields: Record<string, string> = {};
      p.metafields?.edges.forEach((mf) => {
        const { key, value } = mf.node;
        metafields[key] = value;
      });

      return {
        id: p.id,
        title: p.title,
        artist: p.vendor,
        imageUrl: p.images.edges[0]?.node.originalSrc || null,
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

    // ✅ サーバー側で prefix match を適用
    if (search) {
      const q = search.toLowerCase();
      const before = formatted.length;

      formatted = formatted.filter(
        (p) =>
          p.title.toLowerCase().startsWith(q) ||
          (p.artist && p.artist.toLowerCase().startsWith(q))
      );

      console.log("🔍 検索ワード:", search);
      console.log("🔍 フィルタ前件数:", before);
      console.log("🔍 フィルタ後件数:", formatted.length);
    }

    return res.status(200).json({ products: formatted });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ /api/products エラー詳細:", error);
    return res.status(500).json({ error: error.message });
  }
}
