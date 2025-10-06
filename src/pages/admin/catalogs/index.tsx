// src/pages/admin/catalogs/index.tsx

export const dynamic = "force-dynamic"; // ✅ ← これを最初に追加！
import { useEffect, useState } from "react";
import {
  IndexTable,
  Text,
  Spinner,
  EmptyState,
  Button,
  InlineStack,
  BlockStack,
  Icon,
  useIndexResourceState,
  Banner,
} from "@shopify/polaris";
import { ExternalIcon, DeleteIcon } from "@shopify/polaris-icons";
import AdminHeader from "@/components/AdminHeader";

interface Catalog {
  id: string;
  title: string;
  createdAt?: string;
  previewUrl?: string;
}

export default function CatalogListPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resourceItems = catalogs.map((c) => ({ id: c.id }));
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState<{ id: string }>(resourceItems);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const res = await fetch("/api/catalogs");
        const data = await res.json();
        setCatalogs(data.catalogs || []);
      } catch (err) {
        console.error("Failed to load catalogs:", err);
        setError("カタログ一覧の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogs();
  }, []);

  const handleDelete = async () => {
    if (selectedResources.length === 0) return;
    const confirmDelete = window.confirm(
      `選択した ${selectedResources.length} 件のカタログを削除しますか？`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/catalogs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedResources }),
      });
      if (!res.ok) throw new Error("削除に失敗しました");
      setCatalogs((prev) =>
        prev.filter((c) => !selectedResources.includes(c.id))
      );
    } catch (err) {
      console.error(err);
      setError("削除処理中にエラーが発生しました。");
    }
  };

  return (
    <div style={{ width: "100%", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <Text as="h1" variant="headingLg" fontWeight="regular">
          Catalog List
        </Text>
      </div>

      {/* ✅ タブとNew Recordボタンを同一行に配置 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <AdminHeader />
        <Button variant="primary" url="/admin/catalogs/new">
          New Record
        </Button>
      </div>

      {error && (
        <Banner tone="critical" title="エラーが発生しました">
          <p>{error}</p>
        </Banner>
      )}

      {loading ? (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <Spinner accessibilityLabel="Loading catalogs" size="large" />
        </div>
      ) : catalogs.length === 0 ? (
        <EmptyState
          heading="保存されたカタログはありません"
          action={{ content: "New Record", url: "/admin/catalogs/new" }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>カタログを作成すると、ここに一覧表示されます。</p>
        </EmptyState>
      ) : (
        <BlockStack gap="400">
          {/* ✅ 枠なしフラットテーブル */}
          <div style={{ border: "none", borderRadius: "0", boxShadow: "none" }}>
            <IndexTable
              resourceName={{ singular: "catalog", plural: "catalogs" }}
              itemCount={catalogs.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "タイトル" },
                { title: "作成日" },
                { title: "プレビューURL" },
                { title: "" },
              ]}
              selectable
            >
              {catalogs.map((catalog, index) => {
                const createdAtDate = catalog.createdAt
                  ? new Date(catalog.createdAt).toLocaleString()
                  : "-";
                return (
                  <IndexTable.Row
                    id={catalog.id}
                    key={catalog.id}
                    selected={selectedResources.includes(catalog.id)}
                    position={index}
                  >
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
                          className="text-sky-600 hover:underline inline-flex items-center"
                        >
                          {catalog.previewUrl}
                          <span style={{ marginLeft: "10px" }}>
                            <Icon source={ExternalIcon} tone="base" />
                          </span>
                        </a>
                      ) : (
                        "-"
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Button
                        size="slim"
                        url={`/admin/catalogs/new?id=${catalog.id}`}
                        variant="plain"
                      >
                        編集
                      </Button>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                );
              })}
            </IndexTable>
          </div>

          {/* ✅ 下部ボタン：削除＋New Record */}
          <InlineStack align="space-between">
            {/* 🔸 テキスト・アイコン黒（variant='plain'でフラット＋黒表示） */}
            <Button
              variant="plain"
              icon={<Icon source={DeleteIcon} tone="base" />}
              onClick={handleDelete}
              disabled={selectedResources.length === 0}
            >
              削除
            </Button>

            <Button variant="primary" url="/admin/catalogs/new">
              New Record
            </Button>
          </InlineStack>
        </BlockStack>
      )}
    </div>
  );
}
