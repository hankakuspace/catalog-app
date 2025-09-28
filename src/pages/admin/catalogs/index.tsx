// src/pages/admin/catalogs/index.tsx
import { useEffect, useState } from "react";
import {
  Card,
  IndexTable,
  Text,
  Spinner,
  EmptyState,
  Page,
  Link as PolarisLink,
} from "@shopify/polaris";

interface Catalog {
  id: string;
  title: string;
  createdAt?: { seconds: number; nanoseconds: number; toDate?: () => Date };
  createdBy?: string;
  previewUrl?: string;
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
    <Page title="保存済みカタログ一覧" fullWidth>
      {loading ? (
        <Card>
          <div style={{ padding: "20px", textAlign: "center" }}>
            <Spinner accessibilityLabel="Loading catalogs" size="large" />
          </div>
        </Card>
      ) : catalogs.length === 0 ? (
        <Card>
          <EmptyState
            heading="保存されたカタログはありません"
            action={{ content: "新しいカタログを作成", url: "/admin/catalogs/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>カタログを作成すると、ここに一覧表示されます。</p>
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <IndexTable
            resourceName={{ singular: "catalog", plural: "catalogs" }}
            itemCount={catalogs.length}
            headings={[
              { title: "タイトル" },
              { title: "作成日" },
              { title: "作成者" },
              { title: "プレビューURL" },
              { title: "View" },
            ]}
            selectable={false}
          >
            {catalogs.map((catalog, index) => {
              // ✅ Firestore Timestamp を正しい日付に変換
              let createdAtDate = "-";
              if (catalog.createdAt) {
                if (typeof catalog.createdAt.toDate === "function") {
                  createdAtDate = catalog.createdAt.toDate().toLocaleString();
                } else if ("seconds" in catalog.createdAt) {
                  createdAtDate = new Date(
                    catalog.createdAt.seconds * 1000
                  ).toLocaleString();
                }
              }

              return (
                <IndexTable.Row id={catalog.id} key={catalog.id} position={index}>
                  {/* タイトル */}
                  <IndexTable.Cell>
                    <Text as="span" fontWeight="semibold">
                      {catalog.title || "(無題)"}
                    </Text>
                  </IndexTable.Cell>

                  {/* 作成日 */}
                  <IndexTable.Cell>{createdAtDate}</IndexTable.Cell>

                  {/* 作成者 */}
                  <IndexTable.Cell>{catalog.createdBy || "-"}</IndexTable.Cell>

                  {/* プレビューURL */}
                  <IndexTable.Cell>
                    {catalog.previewUrl ? (
                      <Text as="span" tone="subdued">
                        {catalog.previewUrl}
                      </Text>
                    ) : (
                      "-"
                    )}
                  </IndexTable.Cell>

                  {/* View */}
                  <IndexTable.Cell>
                    {catalog.previewUrl ? (
                      <PolarisLink url={catalog.previewUrl} external>
                        View
                      </PolarisLink>
                    ) : (
                      "-"
                    )}
                  </IndexTable.Cell>
                </IndexTable.Row>
              );
            })}
          </IndexTable>
        </Card>
      )}
    </Page>
  );
}
