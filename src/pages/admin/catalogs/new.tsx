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
  Banner,
  Popover,
  ActionList,
} from "@shopify/polaris";
import { MenuHorizontalIcon } from "@shopify/polaris-icons";
import AdminLayout from "@/components/AdminLayout";
import styles from "./new.module.css";

// 🔹 Firestore
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// 🔹 DnD
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

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
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);

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

  // 🔹 Firestore 保存処理
  const handleSave = async () => {
    if (!title.trim()) {
      setSaveError("タイトルを入力してください");
      return;
    }
    if (selectedProducts.length === 0) {
      setSaveError("商品を1つ以上追加してください");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await addDoc(collection(db, "catalogs"), {
        title,
        products: selectedProducts,
        createdAt: serverTimestamp(),
      });
      setSaveSuccess(true);
      setTitle("");
      setSelectedProducts([]);
    } catch (err) {
      console.error("Firestore 保存エラー:", err);
      setSaveError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 DnD 並び替え処理
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newArr = Array.from(selectedProducts);
    const [moved] = newArr.splice(result.source.index, 1);
    newArr.splice(result.destination.index, 0, moved);
    setSelectedProducts(newArr);
  };

  const removeItem = (id: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== id));
  };

  return (
    <AdminLayout>
      <style jsx global>{`
        @keyframes shake {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(1px, -1px) rotate(-0.5deg);
          }
          50% {
            transform: translate(-1px, 1px) rotate(0.5deg);
          }
          75% {
            transform: translate(1px, 1px) rotate(-0.5deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }
        .shake {
          animation: shake 0.3s infinite;
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
        <Text as="h1" variant="headingLg">
          新規カタログ作成
        </Text>

        {saveSuccess && (
          <Banner tone="success" title="保存完了">
            カタログを保存しました。
          </Banner>
        )}
        {saveError && (
          <Banner tone="critical" title="エラー">
            {saveError}
          </Banner>
        )}

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
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="products" direction="horizontal">
                    {(provided) => (
                      <div
                        className={styles.previewGrid}
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {selectedProducts.map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  transition: "transform 0.2s ease",
                                }}
                                className={isReorderMode ? "shake" : ""}
                              >
                                <Card>
                                  <BlockStack gap="200">
                                    {/* タイトル + メニュー */}
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <Text as="h3" variant="headingSm">
                                        {item.artist}
                                      </Text>
                                      <Popover
                                        active={activePopoverId === item.id}
                                        activator={
                                          <Button
                                            variant="plain"
                                            icon={MenuHorizontalIcon}
                                            onClick={() =>
                                              setActivePopoverId(
                                                activePopoverId === item.id
                                                  ? null
                                                  : item.id
                                              )
                                            }
                                          />
                                        }
                                        onClose={() => setActivePopoverId(null)}
                                      >
                                        <ActionList
                                          items={[
                                            {
                                              content: isReorderMode
                                                ? "Finish move"
                                                : "Move item",
                                              onAction: () => {
                                                setIsReorderMode(
                                                  !isReorderMode
                                                );
                                                setActivePopoverId(null);
                                              },
                                            },
                                            {
                                              destructive: true,
                                              content: "Remove",
                                              onAction: () =>
                                                removeItem(item.id),
                                            },
                                          ]}
                                        />
                                      </Popover>
                                    </div>

                                    {/* 画像 + 詳細 */}
                                    {item.imageUrl && (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        style={{
                                          width: "100%",
                                          borderRadius: "8px",
                                        }}
                                      />
                                    )}
                                    <Text as="p">{item.title}</Text>
                                    {item.year && <Text as="p">{item.year}</Text>}
                                    {item.dimensions && (
                                      <Text as="p">{item.dimensions}</Text>
                                    )}
                                    {item.medium && (
                                      <Text as="p">{item.medium}</Text>
                                    )}
                                    {item.price && (
                                      <Text as="p">{item.price} 円（税込）</Text>
                                    )}
                                  </BlockStack>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
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

              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
              >
                カタログ作成
              </Button>
            </BlockStack>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
