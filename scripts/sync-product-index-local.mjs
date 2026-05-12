// scripts/sync-product-index-local.mjs
console.log("[local-sync] script loaded");

import { config } from "dotenv";
import crypto from "crypto";

config({ path: ".env.local" });
config({ path: ".env" });

const SHOP = process.argv[2] || "and-collection-a.myshopify.com";
const PROJECT_ID = requiredEnv("FIREBASE_PROJECT_ID");
const CLIENT_EMAIL = requiredEnv("FIREBASE_CLIENT_EMAIL");
const PRIVATE_KEY = requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

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

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleAccessToken() {
  console.log("[local-sync] getGoogleAccessToken start");

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claim = {
    iss: CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsignedJwt = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(claim),
  )}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();

  const signature = signer
    .sign(PRIVATE_KEY, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedJwt}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Google token error: ${JSON.stringify(data)}`);
  }

  console.log("[local-sync] getGoogleAccessToken done");

  return data.access_token;
}

function firestoreBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

function firestoreDocumentBaseName() {
  return `projects/${PROJECT_ID}/databases/(default)/documents`;
}

function documentUrl(collectionName, docId) {
  return `${firestoreBaseUrl()}/${collectionName}/${encodeURIComponent(docId)}`;
}

function toFirestoreValue(value) {
  if (value === undefined) {
    return { nullValue: null };
  }

  if (value === null) {
    return { nullValue: null };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }

    return { doubleValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }

  if (typeof value === "object") {
    const fields = {};

    Object.entries(value).forEach(([key, item]) => {
      if (item !== undefined) {
        fields[key] = toFirestoreValue(item);
      }
    });

    return {
      mapValue: {
        fields,
      },
    };
  }

  return { stringValue: String(value) };
}

function toFirestoreFields(object) {
  const fields = {};

  Object.entries(object).forEach(([key, value]) => {
    if (value !== undefined) {
      fields[key] = toFirestoreValue(value);
    }
  });

  return fields;
}

function fromFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;

  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map(fromFirestoreValue);
  }

  if ("mapValue" in value) {
    return fromFirestoreFields(value.mapValue.fields || {});
  }

  return undefined;
}

function fromFirestoreFields(fields) {
  const object = {};

  Object.entries(fields || {}).forEach(([key, value]) => {
    object[key] = fromFirestoreValue(value);
  });

  return object;
}

async function firestoreGetDocument(token, collectionName, docId) {
  const res = await fetch(documentUrl(collectionName, docId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 404) {
    return null;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Firestore get error: ${JSON.stringify(data)}`);
  }

  return data;
}

async function firestoreRunQueryByShop(token, collectionName, shop) {
  const res = await fetch(`${firestoreBaseUrl()}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath: "shop" },
            op: "EQUAL",
            value: { stringValue: shop },
          },
        },
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Firestore runQuery error: ${JSON.stringify(data)}`);
  }

  return data
    .filter((row) => row.document)
    .map((row) => row.document);
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function fetchJsonWithTimeout(url, options = {}, label = "fetch", ms = 30000) {
  const timeout = timeoutSignal(ms);

  try {
    const res = await fetch(url, {
      ...options,
      signal: timeout.signal,
    });

    const data = await res.json();

    return {
      res,
      data,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${label} timed out after ${ms}ms`);
    }

    throw error;
  } finally {
    timeout.clear();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function firestoreCommit(token, writes) {
  if (writes.length === 0) return;

  const commitSize = 5;

  for (let i = 0; i < writes.length; i += commitSize) {
    const chunk = writes.slice(i, i + commitSize);
    let success = false;

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const { res, data } = await fetchJsonWithTimeout(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            writes: chunk,
          }),
        },
        "Firestore commit",
        30000,
      );

      if (res.ok) {
        success = true;
        console.log(
          `[local-sync] firestore commit done: from=${i} count=${chunk.length} attempt=${attempt}`,
        );
        break;
      }

      const message = JSON.stringify(data);

      if (res.status === 429 || message.includes("RESOURCE_EXHAUSTED")) {
        const waitMs = 10000 * attempt;

        console.log(
          `[local-sync] firestore quota wait: from=${i} count=${chunk.length} attempt=${attempt} wait=${waitMs}ms`,
        );

        await sleep(waitMs);
        continue;
      }

      throw new Error(`Firestore commit error: ${message}`);
    }

    if (!success) {
      throw new Error(`Firestore commit failed after retries: from=${i}`);
    }

    await sleep(1500);
  }
}

function getIndexDocId(shop, productId) {
  return `${shop}__${productId.replace(/\//g, "_")}`;
}

function getChunkDocId(shop, chunkIndex) {
  return `${shop}__chunk_${String(chunkIndex).padStart(4, "0")}`;
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
  if (!reference) return fallbackVendor || "";

  const displayName = reference.displayName?.trim();

  if (displayName) return displayName;

  const fields = reference.fields || [];
  const preferredKeys = ["name", "title", "label", "artist_name", "jp_name"];

  for (const key of preferredKeys) {
    const matched = fields.find((field) => field.key === key);
    const value = matched?.value?.trim();

    if (value) return value;
  }

  for (const field of fields) {
    const value = field.value?.trim();

    if (value) return value;
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

async function loadOfflineSession(token, shop) {
  console.log(`[local-sync] loadOfflineSession start: offline_${shop}`);

  const doc = await firestoreGetDocument(
    token,
    SESSION_COLLECTION,
    `offline_${shop}`,
  );

  if (!doc?.fields) {
    throw new Error(`offline session not found: offline_${shop}`);
  }

  const session = fromFirestoreFields(doc.fields);

  if (!session?.accessToken) {
    throw new Error(`accessToken not found in offline session: offline_${shop}`);
  }

  console.log(`[local-sync] loadOfflineSession done: shop=${session.shop}`);

  return session;
}

async function shopifyGraphql(shop, accessToken, query, variables) {
  const res = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(data)}`);
  }

  return data.data;
}

async function fetchProductsPage(shop, accessToken, first, after) {
  const query = `
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

  return shopifyGraphql(shop, accessToken, query, {
    first,
    after: after ?? null,
  });
}

async function fetchAllProducts(shop, accessToken) {
  const allEdges = [];
  let hasNextPage = true;
  let after = undefined;
  let page = 1;

  while (hasNextPage) {
    console.log(`[local-sync] fetch products page=${page}`);

    const data = await fetchProductsPage(shop, accessToken, 100, after);

    allEdges.push(...data.products.edges);
    hasNextPage = data.products.pageInfo.hasNextPage;
    after = data.products.pageInfo.endCursor ?? undefined;
    page += 1;
  }

  return formatProducts(allEdges);
}

async function deleteCollectionByShop(token, collectionName, shop) {
  console.log(`[local-sync] delete ${collectionName} start`);

  const docs = await firestoreRunQueryByShop(token, collectionName, shop);

  console.log(`[local-sync] delete ${collectionName}: count=${docs.length}`);

  const writes = docs.map((doc) => ({
    delete: doc.name,
  }));

  await firestoreCommit(token, writes);
}

async function saveProductIndex(token, shop, products) {
  await deleteCollectionByShop(token, PRODUCT_CHUNKS_COLLECTION, shop);
  await deleteCollectionByShop(token, PRODUCT_INDEX_COLLECTION, shop);

  const indexWrites = products.map((product) => ({
    update: {
      name: `${firestoreDocumentBaseName()}/${PRODUCT_INDEX_COLLECTION}/${getIndexDocId(
        shop,
        product.id,
      )}`,
      fields: toFirestoreFields({
        ...product,
        shop,
        syncedAt: new Date(),
      }),
    },
  }));

  console.log(`[local-sync] save product index count=${indexWrites.length}`);
  await firestoreCommit(token, indexWrites);

  const chunkWrites = [];

  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE);
    const chunkProducts = products.slice(i, i + CHUNK_SIZE);

    chunkWrites.push({
      update: {
        name: `${firestoreDocumentBaseName()}/${PRODUCT_CHUNKS_COLLECTION}/${getChunkDocId(
          shop,
          chunkIndex,
        )}`,
        fields: toFirestoreFields({
          shop,
          chunkIndex,
          products: chunkProducts,
          count: chunkProducts.length,
          syncedAt: new Date(),
        }),
      },
    });
  }

  console.log(`[local-sync] save chunks count=${chunkWrites.length}`);
  await firestoreCommit(token, chunkWrites);
}

async function main() {
  console.log("[local-sync] env", {
    project: PROJECT_ID,
    client: CLIENT_EMAIL,
    privateKeyLength: PRIVATE_KEY.length,
  });

  const token = await getGoogleAccessToken();
  const session = await loadOfflineSession(token, SHOP);
  const normalizedShop = session.shop || SHOP;

  console.log(`[local-sync] start shop=${normalizedShop}`);

  const products = await fetchAllProducts(normalizedShop, session.accessToken);

  console.log(`[local-sync] fetched products count=${products.length}`);

  await saveProductIndex(token, normalizedShop, products);

  console.log(`[local-sync] done shop=${normalizedShop} count=${products.length}`);
}

main().catch((error) => {
  console.error("[local-sync] failed:", error);
  process.exit(1);
});
