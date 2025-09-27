// src/pages/admin/catalogs/new.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Page,
  Layout,
  BlockStack,
  Text,
  Button,
  TextField,
  Toast,
  Card,
  ResourceList,
  ResourceItem,
  Thumbnail,
} from "@shopify/polaris";

interface Product {
  id: string;
  title: string;
  artist?: string;
  imageUrl?: string;
}

function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  const timer = useMemo(() => ({ id: 0 as any }), []);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.id) {
        clearTimeout(timer.id);
      }
      // @ts-ignore
      timer.id = setTimeout(() => {
        fn(...args);
      }, wait);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, wait]
  );
}

export default function NewCatalog() {
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ active: boolean; message: string }>({
    active: false,
    message: "",
  });

  // 検索 API 呼び出し
  const doSearch = useCallback(async (value: string) => {
    if (!value) {
      setResults([]);
      return;
    }

    // shop の取得: query param を優先、なければ空文字（API 側でフォールバック可能）
    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop") || "";

    console.debug("[catalog/new] search start:", { shop, query: value });

    try {
      const url = `/api/products?${new URLSearchParams({ shop, query: value }).toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error("[catalog/new] /api/products returned non-OK:", res.status);
        setResults([]);
        return;
      }
      const data = await res.json();
      console.debug("[catalog/new] search result count:", data?.products?.length ?? 0);
      setResults(data.products || []);
    } catch (err) {
      console.error("[catalog/new] 商品検索エラー:", err);
      setResults([]);
    }
  }, []);

  // デバウンスを適用
  const debouncedSearch = useDebouncedCallback(doSearch, 300);

  // TextField の onChange に渡す関数（Polaris の signature に合わせる）
  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedSearch(value);
  };

  // 保存処理
  const saveCatalog = async () => {
    if (!title) {
      setToast({ active: true, message: "タイトルを入力してください" });
      return;
    }
    if (selectedProducts.length === 0) {
      setToast({ active: true, message: "商品を1点以上選択してください" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, products: selectedProducts }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ active: true, message: "カタログを保存しました ✅" });
        setTitle("");
        setSelectedProducts([]);
        setQuery("");
        setResults([]);
      } else {
        console.error("保存失敗:", data);
        setToast({ active: true, message: "保存に失敗しました ❌" });
      }
    } catch (err) {
      console.error("保存エラー:", err);
      setToast({ active: true, message: "保存中にエラーが発生しました ❌" });
    } finally {
      setSaving(false);
    }
  };

  // 選択解除（プレビュー側から削除できるようにする）
  const removeSelected = (id: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // 既存の selectedProducts を開発中に復元したい場合の effect（省略可能）
  useEffect(() => {
    // noop - placeholder if later want to load draft
  }, []);

  return (
    <Page title="新規カタログ作成">
      <Layout>
        {/* 左: プレビュー */}
        <Layout.Section variant="oneHalf">
          <Card sectioned>
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
                プレビュー
              </Text>

              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={selectedProducts}
                renderItem={(item) => {
                  const { id, title: pTitle, artist, imageUrl } = item;
                  return (
                    <ResourceItem
                      id={id}
                      media={<Thumbnail source={imageUrl || ""} alt={pTitle} />}
                      onClick={() => {
                        /* ここは空でも型を満たす。削除を入れたい場合は別UIを追加 */
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <Text as="h3" variant="bodyMd" fontWeight="bold">
                            {pTitle}
                          </Text>
                          <div>{artist}</div>
                        </div>
                        <div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSelected(id);
                            }}
                            outline
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    </ResourceItem>
                  );
                }}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* 右: フォーム（検索 + 結果） */}
        <Layout.Section variant="oneHalf">
          <Card sectioned>
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
                カタログ情報
              </Text>

              <TextField
                label="カタログタイトル"
                value={title}
                onChange={setTitle}
                autoComplete="off"
              />

              <TextField
                label="商品検索"
                value={query}
                onChange={handleQueryChange}
                placeholder="例: Audrey, His and Hers..."
                autoComplete="off"
              />

              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={results}
                renderItem={(item) => {
                  const { id, title: pTitle, artist, imageUrl } = item;
                  return (
                    <ResourceItem
                      id={id}
                      media={<Thumbnail source={imageUrl || ""} alt={pTitle} />}
                      onClick={() => {
                        setSelectedProducts((prev) =>
                          prev.find((p) => p.id === id) ? prev : [...prev, item]
                        );
                      }}
                    >
                      <div>
                        <Text as="h3" variant="bodyMd" fontWeight="bold">
                          {pTitle}
                        </Text>
                        <div>{artist}</div>
                      </div>
                    </ResourceItem>
                  );
                }}
              />

              <div style={{ marginTop: 12 }}>
                <Button variant="primary" loading={saving} onClick={saveCatalog}>
                  カタログ作成
                </Button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {toast.active && (
        <Toast
          content={toast.message}
          onDismiss={() => setToast({ active: false, message: "" })}
        />
      )}
    </Page>
  );
}
