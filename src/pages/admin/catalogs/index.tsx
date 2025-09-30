// src/pages/admin/catalogs/index.tsx
import { useEffect, useState } from "react";
import {
  Card,
  IndexTable,
  Text,
  Spinner,
  EmptyState,
  Page,
  Button,
  InlineStack,
  BlockStack,
} from "@shopify/polaris";
import { ExternalIcon } from "@shopify/polaris-icons";

interface Catalog {
  id: string;
  title: string;
  createdAt?: string;
  previewUrl?: string;
}

export default function CatalogListPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const res = await fetch("/api/catalogs");
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
        <BlockStack gap="400">
          {/* 新規作成ボタン */}
          <InlineStack gap="200" align="start" blockAlign="center">
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
                { title: "編集" },
              ]}
              selectable={false} // ✅ 選択（背景色変化）を無効化
            >
              {catalogs.map((catalog, index) => {
                const createdAtDate = catalog.createdAt
                  ? new Date(catalog.createdAt).toLocaleString()
                  : "-";

                return (
                  <IndexTable.Row id={catalog.id} key={catalog.id} position={index}>
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="semibold">
                        {catalog.title || "(無題)"}
                      </Text>
                    </IndexTable.Cell>

                    <IndexTable.Cell>{createdAtDate}</IndexTable.Cell>

                    <IndexTable.Cell>
                      {catalog.previewUrl ? (
                        <a
                          href={catalog.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sky-600 hover:underline"
                        >
                          {catalog.previewUrl}
                          <ExternalIcon />
                        </a>
                      ) : (
                        "-"
                      )}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Button
                        url={`/admin/catalogs/new?id=${catalog.id}`}
                        target="_self"
                      >
                        編集
                      </Button>
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
