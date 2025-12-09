// src/components/PreviewCatalog.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BlockStack,
  Text,
  Popover,
  ActionList,
  Button,
  TextField,
  Checkbox,
} from "@shopify/polaris";
import { MenuHorizontalIcon } from "@shopify/polaris-icons";
import styles from "@/pages/admin/catalogs/new.module.css";

export interface Product {
  id: string;
  title: string;
  price?: string;
  customPrice?: string;
  imageUrl?: string;
  artist?: string;
  year?: string;
  dimensions?: string;
  medium?: string;
  frame?: string;
  material?: string;
  size?: string;
  technique?: string;
  certificate?: string;
  onlineStoreUrl?: string;
}

interface Props {
  title: string;
  leadText?: string;
  products: Product[];
  editable?: boolean; // ← UI 非依存になるが保持
  onReorder?: (products: Product[]) => void;
  onRemove?: (id: string) => void;
  columnCount?: number;
}

const globalShakeKeyframes = `
@keyframes innerShake {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(1px, 0) rotate(0.4deg); }
  50% { transform: translate(-1px, 0) rotate(-0.4deg); }
  75% { transform: translate(1px, 0) rotate(0.4deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
.shake-inner {
  animation: innerShake 0.25s infinite linear;
  transform-origin: center center;
}
`;

const formatTechnique = (value?: string) => {
  if (!value) return "";
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr)) return arr.join(" / ");
    return value;
  } catch {
    return value;
  }
};

function SortableItem({
  id,
  editable,
  isReorderMode,
  children,
}: {
  id: string;
  editable: boolean;
  isReorderMode: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: editable ? "grab" : "default",
    zIndex: isDragging ? 50 : "auto",
  };

  const shakeActive = editable && (isDragging || isReorderMode);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(editable ? { ...attributes, ...listeners } : {})}
    >
      <div className={shakeActive ? "shake-inner" : ""}>{children}</div>
    </div>
  );
}

export default function PreviewCatalog({
  title,
  leadText,
  products,
  editable = false,
  onReorder,
  onRemove,
  columnCount = 3,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);

  const [storeHandle, setStoreHandle] = useState<string>("");

  const formatPrice = (value?: string) => {
    if (!value) return "";
    return Number(value).toLocaleString("ja-JP");
  };

  // ⭐ price editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const shop = localStorage.getItem("shopify_shop");
      if (shop) {
        const handle = shop.replace(".myshopify.com", "");
        setStoreHandle(handle);
      }
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!editable || !onReorder) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(products, oldIndex, newIndex));
    }
  };

  const handleSetCustomPrice = (id: string) => {
    if (!tempPrice.trim()) return;
    onReorder?.(
      products.map((p) =>
        p.id === id ? { ...p, customPrice: tempPrice.trim() } : p
      )
    );
    setEditingItemId(null);
    setTempPrice("");
  };

  const handleResetToDefault = (id: string) => {
    onReorder?.(
      products.map((p) => {
        if (p.id === id) {
          const copy = { ...p };
          delete copy.customPrice;
          return copy;
        }
        return p;
      })
    );
    setCheckedItems((prev) => ({ ...prev, [id]: false }));
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setCheckedItems((prev) => ({ ...prev, [id]: checked }));
    if (checked) {
      setEditingItemId(id);
    } else {
      setEditingItemId(null);
      setTempPrice("");
    }
  };

  const openShopifyEditPage = (productId: string) => {
    if (!productId || !storeHandle) return;
    const numericId = productId.includes("gid://")
      ? productId.replace("gid://shopify/Product/", "")
      : productId;
    const editUrl = `https://admin.shopify.com/store/${storeHandle}/products/${numericId}`;
    window.open(editUrl, "_blank");
  };

  const gridClass =
    columnCount === 2
      ? `${styles.previewGrid} ${styles["cols-2"]}`
      : columnCount === 4
      ? `${styles.previewGrid} ${styles["cols-4"]}`
      : `${styles.previewGrid} ${styles["cols-3"]}`;

  const sanitizedLead = leadText
    ? leadText
        .replace(/color\s*:\s*rgb\(0,\s*0,\s*0\)/gi, "color: #fff")
        .replace(/color\s*:\s*#000/gi, "color: #fff")
    : "";

  return (
    <>
      <style>{globalShakeKeyframes}</style>

      <div className="min-h-screen bg-black text-white flex flex-col">
        <header className="text-center py-8 border-b border-gray-700">
          <img
            src="/andcollection.svg"
            alt="AND COLLECTION"
            className="mx-auto h-12 w-auto filter invert"
          />
          {sanitizedLead && (
            <div
              className="max-w-3xl mx-auto text-center mt-10 mb-5"
              dangerouslySetInnerHTML={{ __html: sanitizedLead }}
            />
          )}
        </header>

        <main className="flex-grow max-w-7xl mx-auto px-6 py-12">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={products.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className={gridClass}>
                {products.map((item) => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    editable={editable}
                    isReorderMode={isReorderMode}
                  >
                    <BlockStack gap="200">
                      {/* 編集メニュー（editable=true の場合のみ） */}
                      {editable && (
                        <div className="flex justify-end mb-2">
                          <Popover
                            active={activePopoverId === item.id}
                            activator={
                              <Button
                                variant="plain"
                                icon={MenuHorizontalIcon}
                                onClick={() =>
                                  setActivePopoverId(
                                    activePopoverId === item.id ? null : item.id
                                  )
                                }
                              />
                            }
                            onClose={() => setActivePopoverId(null)}
                          >
                            <ActionList
                              items={[
                                {
                                  content: isReorderMode ? "移動を完了" : "移動",
                                  onAction: () => {
                                    setIsReorderMode(!isReorderMode);
                                    setActivePopoverId(null);
                                  },
                                },
                                {
                                  content: "編集",
                                  onAction: () => {
                                    openShopifyEditPage(item.id);
                                    setActivePopoverId(null);
                                  },
                                },
                                {
                                  destructive: true,
                                  content: "削除",
                                  onAction: () => {
                                    onRemove?.(item.id);
                                    setActivePopoverId(null);
                                  },
                                },
                              ]}
                            />
                          </Popover>
                        </div>
                      )}

                      {/* 商品画像 */}
                      {item.imageUrl && (
                        <a
                          href={item.onlineStoreUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="block w-full object-contain hover:opacity-80 transition"
                          />
                        </a>
                      )}

                      {/* 商品情報 */}
                      <div className="text-white mt-2 px-2">
                        {item.artist && <Text as="p">{item.artist}</Text>}
                        {item.title && <Text as="p">{item.title}</Text>}
                        {item.year && <Text as="p">{item.year}</Text>}
                        {item.frame && <Text as="p">{item.frame}</Text>}
                        {item.material && <Text as="p">{item.material}</Text>}
                        {item.size && <Text as="p">{item.size}</Text>}
                        {item.technique && (
                          <Text as="p">{formatTechnique(item.technique)}</Text>
                        )}
                        {item.certificate && <Text as="p">{item.certificate}</Text>}
                        {item.dimensions && <Text as="p">{item.dimensions}</Text>}
                        {item.medium && <Text as="p">{item.medium}</Text>}

                        {/* 価格 */}
                        <Text as="p" variant="bodyMd" fontWeight="medium">
                          {item.customPrice
                            ? `${formatPrice(item.customPrice)} 円（税込）`
                            : item.price
                            ? `${formatPrice(item.price)} 円（税込）`
                            : ""}
                        </Text>

                        {/* ================================================= */}
                        {/* ⭐⭐ 価格編集 UI（常時表示版 / editable 無視） ⭐⭐ */}
                        {/* ================================================= */}
                        <div className="mt-3 p-3 border border-gray-700 rounded">
                          <Checkbox
                            label="価格を変更する"
                            checked={checkedItems[item.id] || false}
                            onChange={(checked) =>
                              handleCheckboxChange(item.id, checked)
                            }
                          />

                          {checkedItems[item.id] && (
                            <div className="mt-3 space-y-3">
                              <TextField
                                label="新しい価格"
                                value={tempPrice}
                                onChange={setTempPrice}
                                autoComplete="off"
                              />

                              <Button
                                variant="primary"
                                onClick={() => handleSetCustomPrice(item.id)}
                              >
                                変更する
                              </Button>

                              <Button
                                variant="monochromePlain"
                                onClick={() => handleResetToDefault(item.id)}
                              >
                                元の価格に戻す
                              </Button>
                            </div>
                          )}
                        </div>
                        {/* ================================================= */}
                        {/* ⭐⭐ 価格編集 UI 完全復元 / いつでも表示 ⭐⭐ */}
                        {/* ================================================= */}
                      </div>
                    </BlockStack>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </main>

        <footer className="text-center py-6 border-t border-gray-700 text-sm text-gray-400">
          Copyright © 2025 Clue Co.,Ltd. all rights reserved.
        </footer>
      </div>
    </>
  );
}
