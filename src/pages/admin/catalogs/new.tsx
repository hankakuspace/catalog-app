// src/pages/admin/catalogs/new.tsx
import { useState } from "react";
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

  // 🔍 商品検索
  const searchProducts = async (value: string) => {
    setQuery(value);
    if (!value) {
      setResults([]);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");

    try {
      const res = await fetch(`/api/products?shop=${shop}&query=${value}`);
      if (!res.ok) {
        console.error("API error:", res.status);
        return;
      }
      const data = await res.json();
      setResults(data.products || []);
    } catch (err) {
      console.error("検索エラー:", err);
    }
  };

  // ✅ Firestore に保存
  const saveCatalog = async () => {
    if (!title || selectedProducts.length === 0) {
      setToast({ active: true, message: "タイトルと商品を入力してください" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, products: selectedProducts }),
      });
      if (res.ok) {
        setToast({ active: true, message: "カタログを保存しました ✅" });
        setTitle("");
        setSelectedProducts([]);
        setQuery("");
        setResults([]);
      } else {
        setToast({ active: true, message: "保存に失敗しました ❌" });
      }
    } catch (err) {
      console.error("保存エラー:", err);
      setToast({ active: true, message: "保存中にエラーが発生しました ❌" });
    } finally {
      setSaving(false);
    }
  };

  const removeSelected = (id: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <Page title="新規カタログ作成">
      <Layout>
        {/* 左: プレビュー */}
        <Layout.Section variant="oneHalf">
          <Card>
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
                      onClick={() => {}}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <Text as="h3" variant="bodyMd" fontWeight="bold">
                            {pTitle}
                          </Text>
                          <div>{artist}</div>
                        </div>
                        <Button onClick={() => removeSelected(id)} variant="secondary">
                          削除
                        </Button>
                      </div>
                    </ResourceItem>
                  );
                }}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* 右: フォーム */}
        <Layout.Section variant="oneHalf">
          <Card>
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
                onChange={searchProducts}
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
                      onClick={() =>
                        setSelectedProducts((prev) =>
                          prev.find((p) => p.id === id) ? prev : [...prev, item]
                        )
                      }
                    >
                      <Text as="h3" variant="bodyMd" fontWeight="bold">
                        {pTitle}
                      </Text>
                      <div>{artist}</div>
                    </ResourceItem>
                  );
                }}
              />

              <Button variant="primary" loading={saving} onClick={saveCatalog}>
                カタログ作成
              </Button>
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
