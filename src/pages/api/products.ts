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
  artistMetafield: {
    reference: {
      displayName?: string | null;
      fields?: { key: string; value: string | null }[];
    } | null;
  } | null;
}

interface ProductEdge {
  cursor: string;
  node: ProductNode;
}

interface GraphQLResponse {
  products: {
    edges: ProductEdge[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

type FormattedProduct = {
  id: string;
  title: string;
  artist: string;
  imageUrl: string | null;
  price: string;
  onlineStoreUrl?: string;
  year: string | null;
  size: string;
  status: string;
};

type ProductsCacheEntry = {
  products: FormattedProduct[];
  expiresAt: number;
};

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var __catalogProductsCache__: Map<string, ProductsCacheEntry> | undefined;
}

const productsCache =
  global.__catalogProductsCache__ ??
  (global.__catalogProductsCache__ = new Map<string, ProductsCacheEntry>());

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

function pickArtistNameFromReference(
  reference:
    | {
        displayName?: string | null;
        fields?: { key: string; value: string | null }[];
      }
    | null
    | undefined,
  fallbackVendor: string,
): string {
  if (!reference) {
    return fallbackVendor || "";
  }

  const displayName = reference.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const fields = reference.fields || [];
  const preferredKeys = ["name", "title", "label", "artist_name", "jp_name"];

  for (const key of preferredKeys) {
    const matched = fields.find((field) => field.key === key);
    const value = matched?.value?.trim();
    if (value) {
      return value;
    }
  }

  for (const field of fields) {
    const value = field.value?.trim();
    if (value) {
      return value;
    }
  }

  return fallbackVendor || "";
}

function formatProducts(edges: ProductEdge[]): FormattedProduct[] {
  return edges.map((edge) => {
    const p = edge.node;

    const metafields: Record<string, string> = {};
    p.metafields?.edges.forEach((mf) => {
      metafields[mf.node.key] = mf.node.value;
    });

    const artist = pickArtistNameFromReference(
      p.artistMetafield?.reference,
      p.vendor,
    );

    return {
      id: p.id,
      title: p.title,
      artist,
      imageUrl: p.images.edges[0]?.node.originalSrc || null,
      price: p.variants?.edges[0]?.node?.price || "0.00",
      onlineStoreUrl: p.onlineStorePreviewUrl || undefined,
      year: metafields["year"] || null,
      size: metafields["size"] || "",
      status: p.status,
    };
  });
}

async function fetchProductsPage(
  client: GraphQLClient,
  first: number,
  after?: string,
): Promise<GraphQLResponse> {
  const gqlQuery = gql`
    query Products($first: Int!, $after: String) {
      products(first: $first, sortKey: TITLE, after: $after) {
        edges {
          cursor
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
            artistMetafield: metafield(namespace: "artist", key: "name") {
              reference {
                ... on Metaobject {
                  displayName
                  fields {
                    key
                    value
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  return client.request<GraphQLResponse>(gqlQuery, {
    first,
    after: after ?? null,
  });
}

async function fetchInitialProducts(
  client: GraphQLClient,
): Promise<FormattedProduct[]> {
  const data = await fetchProductsPage(client, 100);
  return formatProducts(data.products.edges);
}

async function fetchAllProductsForSearch(
  client: GraphQLClient,
): Promise<FormattedProduct[]> {
  const allEdges: ProductEdge[] = [];
  let hasNextPage = true;
  let after: string | undefined = undefined;

  while (hasNextPage) {
    const data = await fetchProductsPage(client, 100, after);

    allEdges.push(...data.products.edges);
    hasNextPage = data.products.pageInfo.hasNextPage;
    after = data.products.pageInfo.endCursor ?? undefined;
  }

  return formatProducts(allEdges);
}

function getCachedProducts(shop: string): FormattedProduct[] | null {
  const cached = productsCache.get(shop);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    productsCache.delete(shop);
    return null;
  }

  return cached.products;
}

function setCachedProducts(shop: string, products: FormattedProduct[]) {
  productsCache.set(shop, {
    products,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });
}

function filterAndSortProducts(
  products: FormattedProduct[],
  rawQuery: string,
): Omit<FormattedProduct, "status">[] {
  return products
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

    const hasSearchQuery = rawQuery.trim().length > 0;

    if (!hasSearchQuery) {
      const formatted = await fetchInitialProducts(client);
      const products = filterAndSortProducts(formatted, rawQuery);
      return res.status(200).json({ products });
    }

    const cacheKey = session.shop;
    const cachedProducts = getCachedProducts(cacheKey);

    if (cachedProducts) {
      const products = filterAndSortProducts(cachedProducts, rawQuery);
      return res.status(200).json({ products });
    }

    const formatted = await fetchAllProductsForSearch(client);
    setCachedProducts(cacheKey, formatted);

    const products = filterAndSortProducts(formatted, rawQuery);
    return res.status(200).json({ products });
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(500).json({ error: error.message });
  }
}
