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
  const searchProducts = async (q: string) => {
    setQuery(q);
    if (!q) {
      setResults([]);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const shop = params.get("shop");

    try {
      const res = await fetch(`/api/products?shop=${shop}&query=${q}`);
      const data = await res.json();
      setResults(data.products || []);
    } catch (err) {
      console.error("商品検索エラー:", err);
    }
  };

  // ✅ Firestore に保存
  const saveCatalog = async () => {
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
      } else {
        setToast({ active: true, message: "保存に失敗しました ❌" });
        console.error(data.error);
      }
    } catch (err) {
      setToast({ active: true, message: "エラーが発生しました ❌" });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="新規カタログ作成">
      <Layout>
        {/* 左: プレビュー */}
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingLg">
              プレビュー
            </Text>
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={selectedProducts}
              renderItem={(item) => {
                const { id, title, artist, imageUrl } = item;
                return (
                  <ResourceItem
                    id={id}
                    media={<Thumbnail source={imageUrl || ""} alt={title} />}
                    onClick={() => {}} // Polaris v13 で必須
                  >
                    <Text as="h3" variant="bodyMd" fontWeight="bold">
                      {title}
                    </Text>
                    <div>{artist}</div>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>

        {/* 右: 入力フォーム */}
        <Layout.Section>
          <BlockStack gap="400">
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
                const { id, title, artist, imageUrl } = item;
                return (
                  <ResourceItem
                    id={id}
                    media={<Thumbnail source={imageUrl || ""} alt={title} />}
                    onClick={() =>
                      setSelectedProducts((prev) =>
                        prev.find((p) => p.id === id) ? prev : [...prev, item]
                      )
                    }
                  >
                    <Text as="h3" variant="bodyMd" fontWeight="bold">
                      {title}
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
