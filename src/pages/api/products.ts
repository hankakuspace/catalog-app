// src/pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopify, sessionStorage } from "@/lib/shopify";
import { GraphQLClient, gql } from "graphql-request";

interface ProductNode {
  id: string;
  title: string;
  vendor: string;
  onlineStorePreviewUrl: string | null;
  status: string;
  handle: string;
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

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function isNumericQuery(raw: string): boolean {
  return /^\d+$/.test(raw.trim());
}

function yearMatches(raw: string, yearValue: string | null): boolean {
  const q = raw.trim();
  if (!isNumericQuery(q)) return true;
  if (!yearValue) return false;

  const year = Number(yearValue);
  if (Number.isNaN(year)) return false;

  if (q.length === 1) {
    const start = Number(q) * 1000;
    return year >= start && year <= start + 999;
  }
  if (q.length === 2) {
    const start = Number(q) * 100;
    return year >= start && year <= start + 99;
  }
  if (q.length === 3) {
    const start = Number(q) * 10;
    return year >= start && year <= start + 9;
  }
  if (q.length === 4) {
    return year === Number(q);
  }
  return false;
}

function textMatches(raw: string, title: string, artist: string): boolean {
  const q = normalizeText(raw);
  if (!q) return true;

  const normalizedTitle = normalizeText(title);
  const normalizedArtist = normalizeText(artist);

  return normalizedTitle.startsWith(q) || normalizedArtist.startsWith(q);
}

function getSearchRank(raw: string, title: string, artist: string): number {
  const q = normalizeText(raw);
  if (!q) return 0;

  const normalizedTitle = normalizeText(title);
  const normalizedArtist = normalizeText(artist);

  if (normalizedTitle.startsWith(q)) return 1;
  if (normalizedArtist.startsWith(q)) return 2;

  return 99;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const shop = req.query.shop as string | undefined;
    const rawQuery = (req.query.query as string) || "";

    let session = shop
      ? await sessionStorage.loadSession(`offline_${shop}`)
      : null;

    if (!session) {
      const sessionId = await shopify.session.getCurrentId({
        isOnline: true,
        rawRequest: req,
        rawResponse: res,
      });
      session = sessionId ? await sessionStorage.loadSession(sessionId) : null;
    }

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const client = new GraphQLClient(
      `https://${session.shop}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          "X-Shopify-Access-Token": session.accessToken!,
        },
      },
    );

    const gqlQuery = gql`
      {
        products(first: 100, sortKey: TITLE) {
          edges {
            node {
              id
              title
              vendor
              handle
              status
              onlineStorePreviewUrl
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

    const formatted = data.products.edges.map((edge) => {
      const p = edge.node;

      const metafields: Record<string, string> = {};
      p.metafields?.edges.forEach((mf) => {
        metafields[mf.node.key] = mf.node.value;
      });

      return {
        id: p.id,
        title: p.title,
        artist: p.vendor,
        imageUrl: p.images.edges[0]?.node.originalSrc || null,
        price: p.variants?.edges[0]?.node?.price || "0.00",
        onlineStoreUrl: p.onlineStorePreviewUrl || undefined,
        year: metafields["year"] || null,
        size: metafields["size"] || "",
        status: p.status,
      };
    });

    const products = formatted
      .filter((product) => {
        if (!rawQuery) return true;

        if (isNumericQuery(rawQuery)) {
          return yearMatches(rawQuery, product.year);
        }

        return textMatches(rawQuery, product.title, product.artist);
      })
      .sort((a, b) => {
        const rankDiff =
          getSearchRank(rawQuery, a.title, a.artist) -
          getSearchRank(rawQuery, b.title, b.artist);

        if (rankDiff !== 0) return rankDiff;

        return a.title.localeCompare(b.title, "ja");
      })
      .map(({ status, ...rest }) => rest);

    return res.status(200).json({ products });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: error.message });
  }
}
