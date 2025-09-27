// src/pages/admin/catalogs/new.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Page,
  BlockStack,
  Text,
  TextField,
  Card,
  ResourceList,
  ResourceItem,
  Spinner,
  Thumbnail,
  Button,
  Toast,
} from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

interface Product {
  id: string;
  title: string;
  artist?: string;
  imageUrl?: string;
  medium?: string;
  dimensions?: string;
  price?: number;
  year?: string;
}

export default function NewCatalogPage() {
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ active: boolean; message: string }>({
    active: false,
    message: "",
  });

  // 入力が変わるたびに検索（debounce 300ms）
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

  // Firestore 保存
  const handleSaveCatalog = async () => {
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
        setSearchQuery("");
        setSearchResults([]);
      } else {
        setToast({ active: true, message: "保存に失敗しました ❌" });
      }
    } catch (err) {
      console.error("保存エラー:", err);
      setToast({ active: true, message: "エラーが発生しました ❌" });
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return "";
    return `${price.toLocaleString()} 円（税込）`;
  };

  return (
    <AdminLayout>
      <Page title="新規カタログ作成">
        {/* Polaris Layout ではなく CSS Grid で3/4 + 1/4 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: "24px",
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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "24px",
                    width: "100%",
                  }}
                >
                  {selectedProducts.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid #e1e1e1",
                        borderRadius: "8px",
                        padding: "12px",
                        background: "#fff",
                      }}
                    >
                      <Thumbnail
                        source={item.imageUrl || ""}
                        alt={item.title}
                        size="large"
                      />
                      <Text as="h3" variant="bodyMd" fontWeight="bold">
                        {item.artist}
                      </Text>
                      <Text as="p">
                        {item.title} {item.year ? `, ${item.year}` : ""}
                      </Text>
                      <Text as="p">{item.medium}</Text>
                      <Text as="p">{item.dimensions}</Text>
                      <Text as="p">{formatPrice(item.price)}</Text>
                    </div>
                  ))}
                </div>
              )}
            </BlockStack>
          </Card>

          {/* 右：フォーム */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                カタログ情報
              </Text>
              <TextField
                label="タイトル"
                value={title}
                onChange={setTitle}
                autoComplete="off"
              />

              <BlockStack gap="200">
                <Text as="h2" variant="headingSm">
                  商品検索
                </Text>
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

              {/* 保存ボタン */}
              <Button variant="primary" loading={saving} onClick={handleSaveCatalog}>
                カタログ作成
              </Button>
            </BlockStack>
          </Card>
        </div>

        {toast.active && (
          <Toast
            content={toast.message}
            onDismiss={() => setToast({ active: false, message: "" })}
          />
        )}
      </Page>
    </AdminLayout>
  );
}
