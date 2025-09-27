// src/pages/admin/catalogs/new.tsx
"use client";

import { useState } from "react";
import {
  Page,
  Layout,
  BlockStack,
  Text,
  TextField,
  Button,
  Card,
  InlineStack,
  ResourceList,
  Spinner,
} from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

interface Product {
  id: string;
  title: string;
}

export default function NewCatalogPage() {
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products?query=${encodeURIComponent(searchQuery)}`);
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
                    renderItem={(item) => {
                      return {
                        id: item.id,
                        accessibilityLabel: `${item.title} を表示`,
                        shortcutActions: [],
                        persistActions: true,
                        media: null,
                        onClick: () => {},
                        children: <Text as="p">{item.title}</Text>,
                      };
                    }}
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
                <TextField
                  label="ラベル"
                  value={label}
                  onChange={setLabel}
                  autoComplete="off"
                />

                <BlockStack gap="200">
                  <Text as="h2" variant="headingSm">
                    商品検索
                  </Text>
                  <InlineStack gap="200">
                    <TextField
                      label="検索キーワード"
                      labelHidden
                      value={searchQuery}
                      onChange={setSearchQuery}
                      autoComplete="off"
                    />
                    <Button onClick={handleSearch} loading={loading}>
                      検索
                    </Button>
                  </InlineStack>

                  {loading ? (
                    <Spinner accessibilityLabel="検索中" size="large" />
                  ) : (
                    <ResourceList
                      resourceName={{ singular: "product", plural: "products" }}
                      items={searchResults}
                      renderItem={(item) => {
                        return {
                          id: item.id,
                          accessibilityLabel: `${item.title} を追加`,
                          onClick: () => handleAddProduct(item),
                          children: (
                            <InlineStack align="space-between">
                              <Text as="p">{item.title}</Text>
                              <Button onClick={() => handleAddProduct(item)}>追加</Button>
                            </InlineStack>
                          ),
                        };
                      }}
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
