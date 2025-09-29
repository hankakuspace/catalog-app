// src/pages/preview/[id].tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Card,
  Page,
  Layout,
  Text,
  Spinner,
  BlockStack,
} from "@shopify/polaris";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Product {
  id: string;
  title: string;
  price?: string;
  year?: string;
  credit?: string;
  type?: string;
  importance?: string;
  edition?: string;
  signed?: string;
  dimensions?: string;
  medium?: string;
  frame?: string;
  image?: string;
  imageUrl?: string;
}

interface Catalog {
  title: string;
  products: Product[];
  createdAt?: string;
  previewUrl?: string;
}

export default function CatalogPreview() {
  const router = useRouter();
  const { id } = router.query;

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchCatalog = async () => {
      try {
        const ref = doc(db, "shopify_catalogs_app", id as string);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data() as Omit<Catalog, "createdAt"> & {
            createdAt?: unknown;
            products?: unknown[]; // ✅ unknown に修正
          };

          let createdAt: string | undefined;
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === "string") {
            createdAt = data.createdAt;
          }

          // ✅ products を安全に補完
          const products: Product[] = Array.isArray(data.products)
            ? data.products.map((p, index) => {
                const obj = p as Record<string, unknown>;
                return {
                  id: typeof obj.id === "string" ? obj.id : String(index),
                  title:
                    typeof obj.title === "string" ? obj.title : "(無題)",
                  price:
                    typeof obj.price === "string" ? obj.price : undefined,
                  year:
                    typeof obj.year === "string" ? obj.year : undefined,
                  credit:
                    typeof obj.credit === "string" ? obj.credit : undefined,
                  type: typeof obj.type === "string" ? obj.type : undefined,
                  importance:
                    typeof obj.importance === "string"
                      ? obj.importance
                      : undefined,
                  edition:
                    typeof obj.edition === "string" ? obj.edition : undefined,
                  signed:
                    typeof obj.signed === "string" ? obj.signed : undefined,
                  dimensions:
                    typeof obj.dimensions === "string"
                      ? obj.dimensions
                      : undefined,
                  medium:
                    typeof obj.medium === "string" ? obj.medium : undefined,
                  frame: typeof obj.frame === "string" ? obj.frame : undefined,
                  image:
                    typeof obj.image === "string"
                      ? obj.image
                      : typeof obj.imageUrl === "string"
                      ? obj.imageUrl
                      : undefined,
                  imageUrl:
                    typeof obj.imageUrl === "string"
                      ? obj.imageUrl
                      : undefined,
                };
              })
            : [];

          setCatalog({
            title: data.title || "(無題)",
            products,
            createdAt,
            previewUrl: data.previewUrl || "",
          });
        } else {
          setCatalog(null);
        }
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
        setCatalog(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <Spinner accessibilityLabel="Loading catalog" size="large" />
      </div>
    );
  }

  if (!catalog) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="p" tone="critical">
                カタログが見つかりませんでした。
              </Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title={catalog.title}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              {catalog.title}
            </Text>
            {catalog.createdAt && (
              <Text as="p" tone="subdued">
                作成日: {catalog.createdAt}
              </Text>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "20px",
              }}
            >
              {catalog.products?.map((p) => (
                <Card key={p.id}>
                  <BlockStack gap="200">
                    {p.image && (
                      // ⚠️ 後で next/image に切り替え予定
                      <img
                        src={p.image}
                        alt={p.title}
                        style={{ width: "100%", borderRadius: "8px" }}
                      />
                    )}
                    <Text as="h3" variant="headingSm">
                      {p.title}
                    </Text>
                    {p.price && <Text as="p">価格: ¥{p.price}</Text>}
                    {p.year && <Text as="p">制作年: {p.year}</Text>}
                    {p.dimensions && (
                      <Text as="p">サイズ: {p.dimensions}</Text>
                    )}
                    {p.medium && <Text as="p">素材: {p.medium}</Text>}
                    {p.frame && <Text as="p">フレーム: {p.frame}</Text>}
                  </BlockStack>
                </Card>
              ))}
            </div>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
