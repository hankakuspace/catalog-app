// src/pages/admin/catalogs/index.tsx
import { useEffect, useState } from "react";
import { Page, Card, IndexTable, Text, Spinner, EmptyState } from "@shopify/polaris";
import Link from "next/link";

interface Product {
  id: string;
  title: string;
}

interface Catalog {
  id: string;
  title: string;
  products?: Product[];
  createdAt?: { seconds: number; nanoseconds: number };
}

export default function CatalogListPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const res = await fetch("/api/catalogs/list");
        const data = await res.json();
        setCatalogs(data.catalogs || []);
      } catch (err) {
        console.error("Failed to load catalogs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogs();
  }, []);

  return (
    <Page title="保存済みカタログ一覧">
      <Card>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center" }}>
            <Spinner accessibilityLabel="Loading catalogs" size="large" />
          </div>
        ) : catalogs.length === 0 ? (
          <EmptyState
            heading="保存されたカタログはありません"
            action={{ content: "新しいカタログを作成", url: "/admin/catalogs/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>カタログを作成すると、ここに一覧表示されます。</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={{ singular: "catalog", plural: "catalogs" }}
            itemCount={catalogs.length}
            headings={[
              { title: "タイトル" },
              { title: "作成日" },
              { title: "商品数" },
            ]}
            selectable={false}
          >
            {catalogs.map((catalog, index) => {
              const createdAtDate = catalog.createdAt
                ? new Date(catalog.createdAt.seconds * 1000).toLocaleString()
                : "-";

              return (
                <IndexTable.Row id={catalog.id} key={catalog.id} position={index}>
                  <IndexTable.Cell>
                    <Link href={`/admin/catalogs/${catalog.id}`}>
                      <Text as="span" fontWeight="bold">{catalog.title || "(無題)"}</Text>
                    </Link>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{createdAtDate}</IndexTable.Cell>
                  <IndexTable.Cell>{catalog.products?.length || 0}</IndexTable.Cell>
                </IndexTable.Row>
