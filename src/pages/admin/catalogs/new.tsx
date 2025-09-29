// src/pages/admin/catalogs/new.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
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
import styles from "./new.module.css";

// dnd-kit
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function SortableItem({
  id,
  isReorderMode,
  children,
}: {
  id: string;
  isReorderMode: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: "100%",
    display: "flex",
    flexDirection: "column",
  };

  const shakeClass = isReorderMode || isDragging ? styles.shakeWrapper : "";

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className={shakeClass} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

export default function NewCatalogPage() {
  const router = useRouter();
  const { id } = router.query;

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

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const maxHeightRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ✅ 編集モードなら既存データを読み込み
  useEffect(() => {
    if (!router.isReady || !id) return;
    const fetchCatalog = async () => {
      try {
        const res = await fetch(`/api/catalogs?id=${id}`);
        const data = await res.json();
        if (res.ok && data.catalog) {
          setTitle(data.catalog.title || "");
          setSelectedProducts(data.catalog.products || []);
        }
      } catch (err) {
        console.error("カタログ取得エラー:", err);
      }
    };
    fetchCatalog();
  }, [router.isReady, id]);

  // ✅ 各カードの高さを最大に揃える
  const adjustHeights = useCallback(() => {
    if (!cardRefs.current.length) return;
    let maxH = 0;
    cardRefs.current.forEach((el) => {
      if (el) maxH = Math.max(maxH, el.offsetHeight);
    });
    maxHeightRef.current = maxH;
    cardRefs.current.forEach((el) => {
      if (el) el.style.height = `${maxH}px`;
    });
  }, []);

  useEffect(() => {
    if (selectedProducts.length > 0) {
      adjustHeights();
      window.addEventListener("resize", adjustHeights);
      return () => window.removeEventListener("resize", adjustHeights);
    }
  }, [selectedProducts, adjustHeights]);

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

  const handleSave = async () => {
    if (!title.trim() || selectedProducts.length === 0) {
      setSaveError("タイトルと商品は必須です");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const body = { id, title, products: selectedProducts };

      const res = await fetch("/api/catalogs", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失敗");

      setSaveSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setSaveError(`保存に失敗しました: ${err.message}`);
      } else {
        setSaveError(`保存に失敗しました: ${String(err)}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSelectedProducts((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeItem = (id: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== id));
  };

  return (
    <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
      <Text as="h1" variant="headingLg">
        {id ? "カタログ編集" : "新規カタログ作成"}
      </Text>

      {saveSuccess && <Banner tone="success" title="保存完了">カタログを保存しました。</Banner>}
      {saveError && <Banner tone="critical" title="エラー">{saveError}</Banner>}

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "20px", marginTop: "20px" }}>
        {/* 左：プレビュー */}
        <Card>
          <BlockStack gap="400">
            {selectedProducts.length === 0 ? (
              <Text as="p">まだ商品が追加されていません</Text>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={selectedProducts.map((p) => p.id)} strategy={rectSortingStrategy}>
                  <div className={styles.previewGrid}>
                    {selectedProducts.map((item, index) => (
                      <SortableItem key={item.id} id={item.id} isReorderMode={isReorderMode}>
                        <div className="cardWrapper">
                          <Card>
                            <div ref={(el) => { cardRefs.current[index] = el; }} className="cardInner">
                              <BlockStack gap="200">
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <Text as="h3" variant="headingSm">{item.artist}</Text>
                                  <Popover
                                    active={activePopoverId === item.id}
                                    activator={
                                      <Button
                                        variant="plain"
                                        icon={MenuHorizontalIcon}
                                        onClick={() =>
                                          setActivePopoverId(activePopoverId === item.id ? null : item.id)
                                        }
                                      />
                                    }
                                    onClose={() => setActivePopoverId(null)}
                                  >
                                    <ActionList
                                      items={[
                                        {
                                          content: isReorderMode ? "Finish move" : "Move item",
                                          onAction: () => {
                                            setIsReorderMode(!isReorderMode);
                                            setActivePopoverId(null);
                                          },
                                        },
                                        {
                                          destructive: true,
                                          content: "Remove",
                                          onAction: () => removeItem(item.id),
                                        },
                                      ]}
                                    />
                                  </Popover>
                                </div>
                                {item.imageUrl && (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.title}
                                    style={{ width: "100%", borderRadius: 8 }}
                                    onLoad={adjustHeights}
                                  />
                                )}
                                <Text as="p">{item.title}</Text>
                                {item.year && <Text as="p">{item.year}</Text>}
                                {item.dimensions && <Text as="p">{item.dimensions}</Text>}
                                {item.medium && <Text as="p">{item.medium}</Text>}
                                {item.price && <Text as="p">{item.price} 円（税込）</Text>}
                              </BlockStack>
                            </div>
                          </Card>
                        </div>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </BlockStack>
        </Card>

        {/* 右：フォーム */}
        <Card>
          <BlockStack gap="400">
            <TextField label="タイトル" value={title} onChange={setTitle} autoComplete="off" />
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
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {id ? "カタログ更新" : "カタログ作成"}
            </Button>
          </BlockStack>
        </Card>
      </div>
    </div>
  );
}
