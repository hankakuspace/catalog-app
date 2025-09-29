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
  imageUrl?: string; // ✅ Firestore に合わせて追加
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
            products?: Record<string, unknown>[];
          };

          let createdAt: string | undefined;
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === "string") {
            createdAt = data.createdAt;
          }

          // ✅ products を安全に補完
          const products: Product[] = Array.isArray(data.products)
            ? data.products.map((p, index) => ({
                id: (p as any).id || String(index),
                title: (p as any).title || "(無題)",
                price: (p as any).price,
                year: (p as any).year,
                credit: (p as any).credit,
                type: (p as any).type,
                importance: (p as any).importance,
                edition: (p as any).edition,
                signed: (p as any).signed,
                dimensions: (p as any).dimensions,
                medium: (p as any).medium,
                frame: (p as any).frame,
                image: (p as any).image || (p as any).imageUrl, // ✅ imageUrl に対応
                imageUrl: (p as any).imageUrl,
              }))
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
                    {p.dimensions && <Text as="p">サイズ: {p.dimensions}</Text>}
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
