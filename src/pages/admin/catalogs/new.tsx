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
} from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

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

  return (
    <AdminLayout>
      <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
        <Text as="h1" variant="headingLg">
          新規カタログ作成
        </Text>

        {/* Polaris LayoutではなくCSS Gridで制御 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* 左側：プレビュー（3/4幅） */}
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
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {selectedProducts.map((item) => (
                    <Card key={item.id}>
                      <BlockStack gap="200">
                        {item.imageUrl && (
                          // Next.js警告回避するなら next/image に切り替え可
                          // ただし一旦 <img> のまま
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            style={{ width: "100%", borderRadius: "8px" }}
                          />
                        )}
                        <Text as="h3" variant="headingSm">
                          {item.artist}
                        </Text>
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

          {/* 右側：フォーム（1/4幅） */}
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
            </BlockStack>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
