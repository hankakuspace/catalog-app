// src/pages/admin/catalogs/new.tsx
"use client";

import { useState, useEffect } from "react";
import {
  BlockStack,
  Text,
  TextField,
  Card,
  ResourceList,
  ResourceItem,
  Spinner,
  Thumbnail,
  Button,
  Popover,
  ActionList,
} from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";
import styles from "./new.module.css";

interface Product {
  id: string;
  title: string;
  artist?: string;
  imageUrl?: string;
  price?: string;
  year?: string;
  dimensions?: string;
  medium?: string;
}

export default function NewCatalogPage() {
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim() !== "") {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        shop: "catalog-app-dev-2.myshopify.com",
        query,
      });

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      setSearchResults(data.products || []);
    } catch (err) {
      console.error("商品検索エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = (product: Product) => {
    if (!selectedProducts.find((p) => p.id === product.id)) {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleSave = () => {
    console.log("✅ カタログ保存:", { title, selectedProducts });
    // TODO: Firestore 保存処理
  };

  const moveItem = (id: string) => {
    console.log("➡️ Move item:", id);
  };

  const removeItem = (id: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== id));
  };

  return (
    <AdminLayout>
      <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
        <Text as="h1" variant="headingLg">
          新規カタログ作成
        </Text>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* 左：プレビュー */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                プレビュー
              </Text>
              {selectedProducts.length === 0 ? (
                <Text as="p">まだ商品が追加されていません</Text>
              ) : (
                <div className={styles.previewGrid}>
                  {selectedProducts.map((item) => (
                    <Card key={item.id}>
                      <BlockStack gap="200">
                        {/* タイトル + メニュー */}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text as="h3" variant="headingSm">
                            {item.artist}
                          </Text>
                          <Popover
  active={activePopoverId === item.id}
  activator={
    <Button
      variant="plain"
      onClick={() =>
        setActivePopoverId(activePopoverId === item.id ? null : item.id)
      }
    >
      …
    </Button>
  }
  onClose={() => setActivePopoverId(null)}
>
  <ActionList
    items={[
      { content: "Move item", onAction: () => moveItem(item.id) },
      { destructive: true, content: "Remove", onAction: () => removeItem(item.id) },
    ]}
  />
</Popover>

                        </div>

                        {/* 画像 + 詳細 */}
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            style={{ width: "100%", borderRadius: "8px" }}
                          />
                        )}
                        <Text as="p">{item.title}</Text>
                        {item.year && <Text as="p">{item.year}</Text>}
                        {item.dimensions && <Text as="p">{item.dimensions}</Text>}
                        {item.medium && <Text as="p">{item.medium}</Text>}
                        {item.price && <Text as="p">{item.price} 円（税込）</Text>}
                      </BlockStack>
                    </Card>
                  ))}
                </div>
              )}
            </BlockStack>
          </Card>

          {/* 右：フォーム */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">カタログ情報</Text>
              <TextField
                label="タイトル"
                value={title}
                onChange={setTitle}
                autoComplete="off"
              />

              <BlockStack gap="200">
                <Text as="h2" variant="headingSm">商品検索</Text>
                <TextField
                  label="検索キーワード"
                  labelHidden
                  value={searchQuery}
                  onChange={setSearchQuery}
                  autoComplete="off"
                  placeholder="作家名・作品タイトルで検索"
                />

                {loading ? (
                  <Spinner accessibilityLabel="検索中" size="large" />
                ) : (
                  <ResourceList
                    resourceName={{ singular: "product", plural: "products" }}
                    items={searchResults}
                    renderItem={(item) => (
                      <ResourceItem
                        id={item.id}
                        accessibilityLabel={`${item.title} を追加`}
                        onClick={() => handleAddProduct(item)}
                        media={
                          item.imageUrl ? (
                            <Thumbnail
                              source={item.imageUrl}
                              alt={item.title}
                              size="small"
                            />
                          ) : undefined
                        }
                      >
                        <Text as="p">
                          {item.artist ? `${item.artist}, ` : ""}
                          {item.title}
                        </Text>
                      </ResourceItem>
                    )}
                  />
                )}
              </BlockStack>

              <Button variant="primary" onClick={handleSave}>
                カタログ作成
              </Button>
            </BlockStack>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
