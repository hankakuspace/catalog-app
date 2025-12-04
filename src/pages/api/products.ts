// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";
import { GraphQLClient, gql } from "graphql-request";

interface ProductNode {
  id: string;
  title: string;
  vendor: string;
  onlineStorePreviewUrl: string | null; // ⭐ 修正
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
    const search = (req.query.query as string) || "";

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

    // ⭐ onlineStorePreviewUrl を取得（正しいフィールド名）
    const gqlQuery = gql`
      {
        products(first: 50) {
          edges {
            node {
              id
              title
              vendor
              onlineStorePreviewUrl   # ⭐ 修正ポイント
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
              metafields(namespace: "product", first: 50) {
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

        // ⭐ 正しい商品ページURL（プレビューURL）
        onlineStoreUrl: p.onlineStorePreviewUrl || undefined,

        // ⭐ 作品情報
        year: metafields["year"] || "",
        dimensions: metafields["dimensions"] || "",
        medium: metafields["medium"] || "",
        frame: metafields["frame"] || "",

        material: metafields["material"] || "",
        size: metafields["size"] || "",
        technique: metafields["technique"] || "",
        certificate: metafields["certificate"] || "",
      };
    });

    if (search) {
      const q = search.toLowerCase().trim();

      formatted = formatted.filter((p) => {
        const titleMatch = p.title?.toLowerCase().includes(q);
        const artistMatch = p.artist?.toLowerCase().includes(q);
        const yearMatch = p.year?.toLowerCase().includes(q);

        return Boolean(titleMatch || artistMatch || yearMatch);
      });
    }

    return res.status(200).json({ products: formatted });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ /api/products エラー詳細:", error);
    return res.status(500).json({ error: error.message });
  }
}
