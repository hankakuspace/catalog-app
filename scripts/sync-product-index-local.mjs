// scripts/sync-product-index-local.mjs
import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { GraphQLClient, gql } from "graphql-request";

config({ path: ".env.local" });
config({ path: ".env" });

const SHOP = process.argv[2] || "and-collection-a.myshopify.com";
const SESSION_COLLECTION = "shopify_sessions_catalog_app";
const PRODUCT_INDEX_COLLECTION = "shopify_product_index";
const PRODUCT_CHUNKS_COLLECTION = "shopify_product_index_chunks";
const CHUNK_SIZE = 20;

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

function normalizeAvailabilityStatus(value) {
  if (!value) return "";

  const trimmed = String(value).trim();
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

function pickArtistNameFromReference(reference, fallbackVendor) {
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

function pickEditionTotalFromVariants(variants) {
  for (const variant of variants) {
    const title = variant.node.title || "";
    const match = title.match(/(?:ed(?:ition)?\s*:?\s*)?\d+\s*\/\s*(\d+)/i);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function formatProducts(edges) {
  return edges.map((edge) => {
    const product = edge.node;
    const metafields = {};

    product.metafields?.edges.forEach((metafield) => {
      metafields[metafield.node.key] = metafield.node.value;
    });

    const artist = pickArtistNameFromReference(
      product.artistMetafield?.reference,
      product.vendor,
    );

    const imageUrls = product.images.edges
      .map((imageEdge) => imageEdge.node.originalSrc)
      .filter(Boolean);

    const editionTotal = pickEditionTotalFromVariants(
      product.variants?.edges || [],
    );

    return {
      id: product.id,
      title: product.title,
      artist,
      imageUrl: imageUrls[0] || null,
      imageUrls,
      price: product.variants?.edges[0]?.node?.price || "0.00",
      onlineStoreUrl: product.onlineStorePreviewUrl || undefined,
      year: metafields.year || null,
      size: metafields.size || "",
      frame: metafields.frame || "",
      material: metafields.material || "",
      technique: metafields.technique || "",
      certificate: metafields.certificate || "",
      dimensions: metafields.dimensions || "",
      medium: metafields.medium || "",
      editionTotal,
      availabilityStatus: normalizeAvailabilityStatus(
        product.availabilityStatusMetafield?.value,
      ),
      status: product.status,
    };
  });
}

function getIndexDocId(shop, productId) {
  return `${shop}__${productId.replace(/\//g, "_")}`;
}

function getChunkDocId(shop, chunkIndex) {
  return `${shop}__chunk_${String(chunkIndex).padStart(4, "0")}`;
}

async function loadOfflineSession(db, shop) {
  const sessionDoc = await db
    .collection(SESSION_COLLECTION)
    .doc(`offline_${shop}`)
    .get();

  if (!sessionDoc.exists) {
    throw new Error(`offline session not found: offline_${shop}`);
  }

  const session = sessionDoc.data();

  if (!session?.accessToken) {
    throw new Error(`accessToken not found in offline session: offline_${shop}`);
  }

  return session;
}

async function fetchProductsPage(client, first, after) {
  const query = gql`
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

  return client.request(query, {
    first,
    after: after ?? null,
  });
}

async function fetchAllProducts(client) {
  const allEdges = [];
  let hasNextPage = true;
  let after = undefined;
  let page = 1;

  while (hasNextPage) {
    console.log(`[local-sync] fetch products page=${page}`);

    const data = await fetchProductsPage(client, 100, after);

    allEdges.push(...data.products.edges);
    hasNextPage = data.products.pageInfo.hasNextPage;
    after = data.products.pageInfo.endCursor ?? undefined;
    page += 1;
  }

  return formatProducts(allEdges);
}

async function deleteCollectionByShop(db, collectionName, shop) {
  const snapshot = await db
    .collection(collectionName)
    .where("shop", "==", shop)
    .get();

  console.log(
    `[local-sync] delete ${collectionName}: count=${snapshot.docs.length}`,
  );

  for (let i = 0; i < snapshot.docs.length; i += 400) {
    const batch = db.batch();

    snapshot.docs.slice(i, i + 400).forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(
      `[local-sync] delete batch ${collectionName}: from=${i} count=${snapshot.docs.slice(i, i + 400).length}`,
    );
  }
}

async function saveProductIndex(db, shop, products) {
  await deleteCollectionByShop(db, PRODUCT_CHUNKS_COLLECTION, shop);
  await deleteCollectionByShop(db, PRODUCT_INDEX_COLLECTION, shop);

  for (let i = 0; i < products.length; i += 300) {
    const batch = db.batch();

    products.slice(i, i + 300).forEach((product) => {
      const ref = db
        .collection(PRODUCT_INDEX_COLLECTION)
        .doc(getIndexDocId(shop, product.id));

      batch.set(ref, {
        ...product,
        shop,
        syncedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    console.log(
      `[local-sync] product index batch: from=${i} count=${products.slice(i, i + 300).length}`,
    );
  }

  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE);
    const chunkProducts = products.slice(i, i + CHUNK_SIZE);
    const ref = db
      .collection(PRODUCT_CHUNKS_COLLECTION)
      .doc(getChunkDocId(shop, chunkIndex));

    const batch = db.batch();

    batch.set(ref, {
      shop,
      chunkIndex,
      products: chunkProducts,
      count: chunkProducts.length,
      syncedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log(
      `[local-sync] chunk batch: index=${chunkIndex} count=${chunkProducts.length}`,
    );
  }
}

async function main() {
  initializeFirebaseAdmin();

  const db = getFirestore();
  const session = await loadOfflineSession(db, SHOP);
  const normalizedShop = session.shop || SHOP;

  console.log(`[local-sync] start shop=${normalizedShop}`);

  const client = new GraphQLClient(
    `https://${normalizedShop}/admin/api/2025-01/graphql.json`,
    {
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
      },
    },
  );

  const products = await fetchAllProducts(client);

  console.log(`[local-sync] fetched products count=${products.length}`);

  await saveProductIndex(db, normalizedShop, products);

  console.log(`[local-sync] done shop=${normalizedShop} count=${products.length}`);
}

main().catch((error) => {
  console.error("[local-sync] failed:", error);
  process.exit(1);
});
