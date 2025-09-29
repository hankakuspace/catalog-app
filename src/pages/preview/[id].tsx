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
import { doc, getDoc } from "firebase/firestore";
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
          const data = snap.data() as Catalog;
          setCatalog({
            ...data,
            createdAt: data.createdAt
              ? new Date(data.createdAt.toDate()).toISOString()
              : undefined,
          });
        }
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "20px",
              }}
            >
              {catalog.products?.map((p) => (
                <Card key={p.id} sectioned>
                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.title}
                      style={{ width: "100%", borderRadius: "8px" }}
                    />
                  )}
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      {p.title}
                    </Text>
                    {p.price && <Text as="p">価格: ¥{p.price}</Text>}
                    {p.year && <Text as="p">制作年: {p.year}</Text>}
                    {p.dimensions && <Text as="p">サイズ: {p.dimensions}</Text>}
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
