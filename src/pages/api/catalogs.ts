// src/pages/api/catalogs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbAdmin, FieldValue } from "@/lib/firebaseAdmin";
import { sessionStorage } from "@/lib/shopify";
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

  if (!shop || products.length === 0) {
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

  if (!session?.accessToken) {
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
  } catch (err) {
    console.error("❌ availability status refresh error:", err);
    return data;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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

        const data = await applyLatestAvailabilityStatuses(doc.data());

        return res.status(200).json({
          catalog: {
            id: doc.id,
            ...data,
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
        .orderBy("createdAt", "desc")
        .get();

      const catalogs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
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

      return res.status(200).json({ catalogs });
    }

    // ✅ POST：新規作成
    if (req.method === "POST") {
      const {
        title,
        label, // ← ★追加
        leadText,
        products,
        shop,
        columnCount,
        passwordEnabled,
        username,
        password,
        expiresAt,
      } = req.body;

      if (!title || !products || !shop) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const docRef = dbAdmin.collection("shopify_catalogs_app").doc();
      const baseUrl = process.env.SHOPIFY_APP_URL;
      if (!baseUrl) throw new Error("SHOPIFY_APP_URL is not defined");

      const previewUrl = `${baseUrl}/preview/${docRef.id}`;

      await docRef.set({
        title,
        label: label || "", // ← ★Firestoreに保存
        leadText: leadText || "",
        products,
        shop,
        columnCount: columnCount || 3,
        passwordEnabled: passwordEnabled || false,
        username: username || "",
        password: password || "",
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

      if (!id) return res.status(400).json({ error: "Missing id" });

      await dbAdmin.collection("shopify_catalogs_app").doc(id).update({
        title,
        label: label || "", // ← ★Firestoreに保存
        leadText: leadText || "",
        products,
        columnCount: columnCount || 3,
        passwordEnabled: passwordEnabled || false,
        username: username || "",
        password: password || "",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ id });
    }

    // ✅ DELETE：複数削除
    if (req.method === "DELETE") {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Invalid request: ids required" });
      }

      const batch = dbAdmin.batch();
      ids.forEach((id: string) => {
        const ref = dbAdmin.collection("shopify_catalogs_app").doc(id);
        batch.delete(ref);
      });
      await batch.commit();

      return res.status(200).json({ success: true, deletedCount: ids.length });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("❌ API error:", err);
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(500).json({ error: String(err) });
  }
}
