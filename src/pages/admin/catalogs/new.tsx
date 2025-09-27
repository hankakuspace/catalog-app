// src/pages/admin/catalogs/new.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  BlockStack,
  Text,
  TextField,
  Card,
  ResourceList,
  ResourceItem,
  Spinner,
  Thumbnail,
} from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

interface Product {
  id: string;
  title: string;
  artist?: string;
  imageUrl?: string; // 追加：商品サムネイル用
}

export default function NewCatalogPage() {
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

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
      const res = await fetch(`/api/products?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      const q = query.toLowerCase();
      const filtered = (data.products || []).filter((p: Product) => {
        const title = p.title?.toLowerCase() || "";
        const artist = p.artist?.toLowerCase() || "";
        return title.includes(q) || artist.includes(q);
      });

      setSearchResults(filtered);
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

  return (
    <AdminLayout>
      <Page title="新規カタログ作成">
        <Layout>
          {/* 左側：プレビュー */}
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  プレビュー
                </Text>
                {selectedProducts.length === 0 ? (
                  <Text as="p">まだ商品が追加されていません</Text>
                ) : (
                  <ResourceList
                    resourceName={{ singular: "product", plural: "products" }}
                    items={selectedProducts}
                    renderItem={(item) => (
                      <ResourceItem
                        id={item.id}
                        accessibilityLabel={`${item.title} を表示`}
                        onClick={() => {}}
                        media={
                          item.imageUrl ? (
                            <Thumbnail source={item.imageUrl} alt={item.title} size="small" />
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
            </Card>
          </Layout.Section>

          {/* 右側：フォーム */}
          <Layout.Section variant="oneHalf">
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
                              <Thumbnail source={item.imageUrl} alt={item.title} size="small" />
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
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AdminLayout>
  );
}
