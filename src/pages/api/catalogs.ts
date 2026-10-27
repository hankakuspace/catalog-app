// src/pages/api/catalogs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sanitizeRichText } from "@/lib/richText";
import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { dbAdmin, FieldValue } from "@/lib/firebaseAdmin";
import {
  sessionStorage,
  requireAdminShop,
  ownsCatalog,
  managementCatalog,
  publicCatalog,
  issuePreviewToken,
  verifyPreviewToken,
  previewCredentialsMatch,
  previewAttemptKey,
} from "@/lib/shopify";
import { GraphQLClient, gql } from "graphql-request";

type CatalogProduct = {
  id?: string;
  availabilityStatus?: string;
  [key: string]: unknown;
};

type ShopifyProductNode = {
  id: string;
  availabilityStatusMetafield?: {
    value: string | null;
  } | null;
};

type ShopifyAvailabilityResponse = {
  nodes: (ShopifyProductNode | null)[];
};

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

async function fetchLatestAvailabilityStatuses(
  shop: string | undefined,
  products: CatalogProduct[],
): Promise<Map<string, string>> {
  const statusMap = new Map<string, string>();

  if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) || products.length === 0) {
    return statusMap;
  }

  const ids = Array.from(
    new Set(
      products
        .map((product) => product.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (ids.length === 0) {
    return statusMap;
  }

  const session = await sessionStorage.loadSession(`offline_${shop}`);

  if (!session?.accessToken || session.shop !== shop) {
    console.warn("Shopify offline session not found:", shop);
    return statusMap;
  }

  const client = new GraphQLClient(
    `https://${session.shop}/admin/api/2025-01/graphql.json`,
    {
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
      },
    },
  );

  const query = gql`
    query ProductAvailabilityStatuses($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          availabilityStatusMetafield: metafield(
            namespace: "custom"
            key: "availability_status"
          ) {
            value
          }
        }
      }
    }
  `;

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const data = await client.request<ShopifyAvailabilityResponse>(query, {
      ids: chunk,
    });

    data.nodes.forEach((node) => {
      if (!node?.id) return;

      statusMap.set(
        node.id,
        normalizeAvailabilityStatus(node.availabilityStatusMetafield?.value),
      );
    });
  }

  return statusMap;
}

async function applyLatestAvailabilityStatuses(data: FirebaseFirestore.DocumentData | undefined) {
  const products = Array.isArray(data?.products)
    ? (data.products as CatalogProduct[])
    : [];

  if (products.length === 0) {
    return data;
  }

  try {
    const statusMap = await fetchLatestAvailabilityStatuses(
      typeof data?.shop === "string" ? data.shop : undefined,
      products,
    );

    if (statusMap.size === 0) {
      return data;
    }

    return {
      ...data,
      products: products.map((product) => {
        if (!product.id || !statusMap.has(product.id)) {
          return product;
        }

        return {
          ...product,
          availabilityStatus: statusMap.get(product.id) || "",
        };
      }),
    };
  } catch {
    console.error("Availability status refresh failed");
    return data;
  }
}

// Empty input cannot remove saved protection. Both final credentials must be present or absent.
function resolveCatalogCredentials(
  input: { username?: unknown; password?: unknown },
  saved: FirebaseFirestore.DocumentData = {},
): { username: string; password: string } | null {
  const resolved = { username: "", password: "" };
  for (const key of ["username", "password"] as const) {
    const previous = saved[key] ?? "";
    const proposed = input[key];
    if (typeof previous !== "string" || (proposed !== undefined && typeof proposed !== "string")) return null;
    if (previous && proposed === "") return null;
    resolved[key] = proposed === undefined ? previous : proposed;
  }
  if (Boolean(resolved.username) !== Boolean(resolved.password)) return null;
  return resolved;
}

// Only Vercel's overwritten single-IP header is accepted as a forwarded client IP.
// Other runtimes or ambiguous headers share a catalog-wide bucket, never a caller-supplied IP.
function previewAttemptSource(req: NextApiRequest): string {
  const forwarded = req.headers["x-vercel-forwarded-for"];
  if (process.env.VERCEL === "1" && typeof forwarded === "string") {
    const ip = forwarded.trim();
    const family = isIP(ip);
    if (family) return `ip:${family === 6 ? new URL(`http://[${ip}]`).hostname : ip}`;
  }
  return "catalog-wide-untrusted-source";
}

async function consumePreviewAttempt(req: NextApiRequest, id: string): Promise<number> {
  const ref = dbAdmin.collection("shopify_catalog_preview_login_attempts")
    .doc(previewAttemptKey(id, previewAttemptSource(req)));
  return dbAdmin.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.data();
    const now = Date.now();
    let count = 0;
    let deadline = now + 10 * 60 * 1000;
    if (snap.exists) {
      const storedDeadline = data?.expiresAt?.toDate?.().getTime();
      if (!Number.isFinite(storedDeadline) || !Number.isInteger(data?.attempts) || data!.attempts < 0) {
        throw new Error("Invalid preview attempt counter");
      }
      if (storedDeadline > now) {
        deadline = storedDeadline;
        count = data!.attempts;
      }
    }
    if (count >= 10) return Math.max(1, Math.ceil((deadline - now) / 1000));
    transaction.set(ref, { attempts: count + 1, expiresAt: new Date(deadline) });
    return 0;
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    // Explicit public mode on the existing route; it can only return allowlisted fields.
    if (req.query.preview === "1") {
      if (!["GET", "POST"].includes(req.method || "")) return res.status(405).json({ error: "Method not allowed" });
      const id = req.query.id;
      if (typeof id !== "string" || !id || id.includes("/")) return res.status(400).json({ error: "Invalid id" });
      const snap = await dbAdmin.collection("shopify_catalogs_app").doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: "Not found" });
      const data = snap.data()!;
      const expires = data.expiresAt?.toDate ? data.expiresAt.toDate() : data.expiresAt ? new Date(data.expiresAt) : null;
      if (expires && (!Number.isFinite(expires.getTime()) || expires.getTime() < Date.now())) {
        return res.status(410).json({ expired: true });
      }
      const protectedCatalog = Boolean(data.username && data.password);
      let token: string | undefined;
      if (protectedCatalog) {
        if (req.method === "POST") {
          try {
            const retryAfter = await consumePreviewAttempt(req, id);
            if (retryAfter) {
              res.setHeader("Retry-After", String(retryAfter));
              return res.status(429).json({ error: "Too many login attempts", requiresAuth: true });
            }
          } catch {
            // A failed/contended counter must not permit credential verification or token issuance.
            return res.status(503).json({ error: "Login temporarily unavailable", requiresAuth: true });
          }
          if (!previewCredentialsMatch(data, req.body?.username, req.body?.password)) {
            return res.status(401).json({ requiresAuth: true });
          }
          token = issuePreviewToken(id, data);
        } else {
          const supplied = req.headers["x-catalog-view-token"];
          if (typeof supplied !== "string" || !verifyPreviewToken(supplied, id, data)) {
            return res.status(401).json({ requiresAuth: true });
          }
        }
      }
      const refreshed = await applyLatestAvailabilityStatuses(data);
      return res.status(200).json({ catalog: publicCatalog(id, refreshed!), ...(token ? { token } : {}) });
    }
    const shop = await requireAdminShop(req, res);
    if (!shop) return;
    // ✅ GET：一覧または個別取得
    if (req.method === "GET") {
      const idParam = Array.isArray(req.query.id)
        ? req.query.id[0]
        : req.query.id ?? null;

      if (idParam) {
        const doc = await dbAdmin
          .collection("shopify_catalogs_app")
          .doc(String(idParam))
          .get();

        if (!doc.exists) return res.status(404).json({ error: "Not found" });

        if (!ownsCatalog(doc.data(), shop)) return res.status(403).json({ error: "Forbidden" });
        const data = await applyLatestAvailabilityStatuses(doc.data());

        return res.status(200).json({
          catalog: {
            id: doc.id,
            ...managementCatalog(data!),
            createdAt: data?.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : null,
            updatedAt: data?.updatedAt?.toDate
              ? data.updatedAt.toDate().toISOString()
              : null,
            expiresAt: data?.expiresAt?.toDate
              ? data.expiresAt.toDate().toISOString()
              : null,
          },
        });
      }

      // ✅ 一覧取得
      const snapshot = await dbAdmin
        .collection("shopify_catalogs_app")
        .where("shop", "==", shop)
        .get();

      const catalogs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...managementCatalog(data),
          createdAt: data?.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : null,
          updatedAt: data?.updatedAt?.toDate
            ? data.updatedAt.toDate().toISOString()
            : null,
          expiresAt: data?.expiresAt?.toDate
            ? data.expiresAt.toDate().toISOString()
            : null,
        };
      });

      catalogs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return res.status(200).json({ catalogs });
    }

    // ✅ POST：新規作成
    if (req.method === "POST") {
      const {
        title,
        label, // ← ★追加
        leadText,
        products,
        columnCount,
        passwordEnabled,
        username,
        password,
        expiresAt,
      } = req.body;

      if (!title || !products || !shop) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const credentials = resolveCatalogCredentials({ username, password });
      if (!credentials) return res.status(400).json({ error: "Invalid credential update" });

      const docRef = dbAdmin.collection("shopify_catalogs_app").doc();
      const baseUrl = process.env.SHOPIFY_APP_URL;
      if (!baseUrl) throw new Error("SHOPIFY_APP_URL is not defined");

      const previewUrl = `${baseUrl}/preview/${docRef.id}`;

      await docRef.set({
        title,
        label: label || "", // ← ★Firestoreに保存
        leadText: sanitizeRichText(leadText),
        products,
        shop,
        columnCount: columnCount || 3,
        passwordEnabled: passwordEnabled || false,
        ...credentials,
        ...(credentials.username && credentials.password ? { previewAuthRevision: randomBytes(32).toString("hex") } : {}),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdAt: FieldValue.serverTimestamp(),
        previewUrl,
      });

      return res.status(200).json({ id: docRef.id, previewUrl });
    }

    // ✅ PUT：更新
    if (req.method === "PUT") {
      const {
        id,
        title,
        label, // ← ★追加
        leadText,
        products,
        columnCount,
        passwordEnabled,
        username,
        password,
        expiresAt,
      } = req.body;

      if (typeof id !== "string" || !id || id.includes("/")) return res.status(400).json({ error: "Invalid id" });

      const ref = dbAdmin.collection("shopify_catalogs_app").doc(id);
      const updated = await dbAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists) return 404;
        if (!ownsCatalog(snap.data(), shop)) return 403;
        const credentials = resolveCatalogCredentials({ username, password }, snap.data());
        if (!credentials) return 400;
        const saved = snap.data()!;
        const credentialsChanged = credentials.username !== (saved.username ?? "") ||
          credentials.password !== (saved.password ?? "");
        transaction.update(ref, {
          title,
          label: label || "", // ← ★Firestoreに保存
          leadText: sanitizeRichText(leadText),
          products,
          columnCount: columnCount || 3,
          passwordEnabled: passwordEnabled || false,
          ...credentials,
          ...(credentialsChanged ? { previewAuthRevision: randomBytes(32).toString("hex") } : {}),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return 200;
      });
      if (updated !== 200) return res.status(updated).json({
        error: updated === 403 ? "Forbidden" : updated === 404 ? "Not found" : "Invalid credential update",
      });
      return res.status(200).json({ id });
    }

    // ✅ DELETE：複数削除
    if (req.method === "DELETE") {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Invalid request: ids required" });
      }

      if (!ids.every((id: unknown) => typeof id === "string" && id && !id.includes("/")) || ids.length > 500) return res.status(400).json({ error: "Invalid ids" });
      const deleted = await dbAdmin.runTransaction(async (transaction) => {
        const refs = ids.map((id: string) => dbAdmin.collection("shopify_catalogs_app").doc(id));
        const snaps = await transaction.getAll(...refs);
        if (snaps.some((snap) => !ownsCatalog(snap.data(), shop))) return false;
        refs.forEach((ref: FirebaseFirestore.DocumentReference) => transaction.delete(ref));
        return true;
      });
      if (!deleted) return res.status(403).json({ error: "Forbidden" });

      return res.status(200).json({ success: true, deletedCount: ids.length });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    console.error("Catalog API failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}
