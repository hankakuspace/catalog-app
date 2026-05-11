// src/pages/api/products/sync.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { GraphQLClient, gql } from "graphql-request";
import { dbAdmin, FieldValue } from "@/lib/firebaseAdmin";
import { sessionStorage } from "@/lib/shopify";

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
    edges: { node: { title: string; price: string } }[];
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
  availabilityStatusMetafield: {
    value: string | null;
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

type IndexedProduct = {
  id: string;
  title: string;
  artist: string;
  imageUrl: string | null;
  imageUrls: string[];
  price: string;
  onlineStoreUrl?: string;
  year: string | null;
  size: string;
  status: string;
  frame?: string;
  material?: string;
  technique?: string;
  certificate?: string;
  dimensions?: string;
  medium?: string;
  editionTotal?: string;
  availabilityStatus?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __catalogProductsCache__: Map<string, { products: IndexedProduct[]; expiresAt: number }> | undefined;
}

function normalizeAvailabilityStatus(value?: string | null): string {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return String(parsed[0] || "").trim();
    }
    if (typeof parsed === "string") {
      return parsed.trim();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
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

function pickEditionTotalFromVariants(
  variants: { node: { title: string; price: string } }[],
): string {
  for (const variant of variants) {
    const title = variant.node.title || "";
    const match = title.match(/(?:ed(?:ition)?\s*:?\s*)?\d+\s*\/\s*(\d+)/i);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function formatProducts(edges: ProductEdge[]): IndexedProduct[] {
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

    const imageUrls = p.images.edges
      .map((imageEdge) => imageEdge.node.originalSrc)
      .filter(Boolean);

    const editionTotal = pickEditionTotalFromVariants(p.variants?.edges || []);

    return {
      id: p.id,
      title: p.title,
      artist,
      imageUrl: imageUrls[0] || null,
      imageUrls,
      price: p.variants?.edges[0]?.node?.price || "0.00",
      onlineStoreUrl: p.onlineStorePreviewUrl || undefined,
      year: metafields["year"] || null,
      size: metafields["size"] || "",
      frame: metafields["frame"] || "",
      material: metafields["material"] || "",
      technique: metafields["technique"] || "",
      certificate: metafields["certificate"] || "",
      dimensions: metafields["dimensions"] || "",
      medium: metafields["medium"] || "",
      editionTotal,
      availabilityStatus: normalizeAvailabilityStatus(
        p.availabilityStatusMetafield?.value,
      ),
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
            images(first: 10) {
              edges {
                node {
                  originalSrc
                }
              }
            }
            variants(first: 50) {
              edges {
                node {
                  title
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
            availabilityStatusMetafield: metafield(
              namespace: "custom"
              key: "availability_status"
            ) {
              value
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

async function fetchAllProducts(client: GraphQLClient): Promise<IndexedProduct[]> {
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

function getIndexDocId(shop: string, productId: string): string {
  return `${shop}__${productId.replace(/\//g, "_")}`;
}

async function deleteExistingIndex(shop: string) {
  const productSnapshot = await dbAdmin
    .collection("shopify_product_index")
    .where("shop", "==", shop)
    .get();

  for (let i = 0; i < productSnapshot.docs.length; i += 400) {
    const batch = dbAdmin.batch();
    productSnapshot.docs.slice(i, i + 400).forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  const chunkSnapshot = await dbAdmin
    .collection("shopify_product_index_chunks")
    .where("shop", "==", shop)
    .get();

  for (let i = 0; i < chunkSnapshot.docs.length; i += 400) {
    const batch = dbAdmin.batch();
    chunkSnapshot.docs.slice(i, i + 400).forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}

function getChunkDocId(shop: string, chunkIndex: number): string {
  return `${shop}__chunk_${String(chunkIndex).padStart(4, "0")}`;
}

async function saveProductIndex(shop: string, products: IndexedProduct[]) {
  await deleteExistingIndex(shop);

  for (let i = 0; i < products.length; i += 400) {
    const batch = dbAdmin.batch();

    products.slice(i, i + 400).forEach((product) => {
      const ref = dbAdmin
        .collection("shopify_product_index")
        .doc(getIndexDocId(shop, product.id));

      batch.set(ref, {
        ...product,
        shop,
        syncedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }

  const chunkSize = 80;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunkIndex = Math.floor(i / chunkSize);
    const ref = dbAdmin
      .collection("shopify_product_index_chunks")
      .doc(getChunkDocId(shop, chunkIndex));

    await ref.set({
      shop,
      chunkIndex,
      products: products.slice(i, i + chunkSize),
      count: products.slice(i, i + chunkSize).length,
      syncedAt: FieldValue.serverTimestamp(),
    });
  }

  global.__catalogProductsCache__?.delete(`firestore-index:${shop}`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const shop =
      typeof req.query.shop === "string"
        ? req.query.shop
        : typeof req.body?.shop === "string"
        ? req.body.shop
        : "";

    if (!shop) {
      return res.status(400).json({ error: "Missing shop" });
    }

    const session = await sessionStorage.loadSession(`offline_${shop}`);

    if (!session?.accessToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const client = new GraphQLClient(
      `https://${session.shop}/admin/api/2025-01/graphql.json`,
      {
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
        },
      },
    );

    const products = await fetchAllProducts(client);
    await saveProductIndex(session.shop, products);

    return res.status(200).json({
      ok: true,
      count: products.length,
    });
  } catch (err) {
    console.error("❌ product sync error:", err);
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(500).json({ error: String(err) });
  }
}
