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
    if (!id || typeof id !== "string") return;

    const fetchCatalog = async () => {
      try {
        console.log("Fetching catalog with id:", id);
        const res = await fetch(`/api/catalogs/get?id=${id}`);
        if (res.ok) {
          const data = await res.json();

          // products を安全に整形
          const products: Product[] = Array.isArray(data.products)
            ? data.products.map((p: any, index: number) => ({
                id: typeof p.id === "string" ? p.id : String(index),
                title: typeof p.title === "string" ? p.title : "(無題)",
                price: p.price,
                year: p.year,
                credit: p.credit,
                type: p.type,
                importance: p.importance,
                edition: p.edition,
                signed: p.signed,
                dimensions: p.dimensions,
                medium: p.medium,
                frame: p.frame,
                image: p.image || p.imageUrl,
                imageUrl: p.imageUrl,
              }))
            : [];

          setCatalog({
            title: data.title || "(無題)",
            products,
            createdAt: data.createdAt || undefined,
            previewUrl: data.previewUrl || "",
          });
        } else {
          console.warn("Catalog fetch failed:", res.status);
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
                      // ⚠️ 後で next/image に置き換え予定
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
