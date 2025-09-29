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
  Button,
  InlineStack,
  BlockStack,
  useIndexResourceState,
} from "@shopify/polaris";

interface Catalog {
  id: string;
  title: string;
  createdAt?: string;
  previewUrl?: string;
}

export default function CatalogListPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  // ✅ Polaris の選択管理フック
const {
  selectedResources,
  allResourcesSelected,
  handleSelectionChange,
} = useIndexResourceState(catalogs as any);

  const handleDelete = async () => {
    if (selectedResources.length === 0) return;
    setDeleting(true);
    try {
      await fetch("/api/catalogs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedResources }),
      });
      setCatalogs((prev) =>
        prev.filter((c) => !selectedResources.includes(c.id))
      );
    } catch (err) {
      console.error("Failed to delete catalogs:", err);
    } finally {
      setDeleting(false);
    }
  };

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
        <BlockStack gap="400">
          {/* 削除 + 新規作成ボタン */}
          <InlineStack gap="200" align="start" blockAlign="center">
            <Button
              tone="critical"
              disabled={selectedResources.length === 0 || deleting}
              onClick={handleDelete}
              loading={deleting}
            >
              削除
            </Button>
            <Button variant="primary" url="/admin/catalogs/new">
              新規カタログ作成
            </Button>
          </InlineStack>

          {/* 一覧テーブル */}
          <Card>
            <IndexTable
              resourceName={{ singular: "catalog", plural: "catalogs" }}
              itemCount={catalogs.length}
              headings={[
                { title: "タイトル" },
                { title: "作成日" },
                { title: "プレビューURL" },
                { title: "View" },
              ]}
              selectable
              selectedItemsCount={selectedResources.length}
              allResourcesSelected={allResourcesSelected}
              onSelectionChange={handleSelectionChange}
            >
              {catalogs.map((catalog, index) => {
                const createdAtDate = catalog.createdAt
                  ? new Date(catalog.createdAt).toLocaleString()
                  : "-";

                return (
                  <IndexTable.Row
                    id={catalog.id}
                    key={catalog.id}
                    position={index}
                    selected={selectedResources.includes(catalog.id)}
                  >
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="semibold">
                        {catalog.title || "(無題)"}
                      </Text>
                    </IndexTable.Cell>

                    <IndexTable.Cell>{createdAtDate}</IndexTable.Cell>

                    <IndexTable.Cell>
                      {catalog.previewUrl ? (
                        <Text as="span" tone="subdued">
                          {catalog.previewUrl}
                        </Text>
                      ) : (
                        "-"
                      )}
                    </IndexTable.Cell>

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

          {/* 下部の新規作成ボタン */}
          <InlineStack align="end">
            <Button variant="primary" url="/admin/catalogs/new">
              新規カタログ作成
            </Button>
          </InlineStack>
        </BlockStack>
      )}
    </Page>
  );
}
