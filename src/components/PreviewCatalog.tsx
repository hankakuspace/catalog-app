// src/components/PreviewCatalog.tsx
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
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
  editable?: boolean;
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

function SortableItem({ id, isEditable, isReorderMode, children }: any) {
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
    cursor: isEditable ? "grab" : "default",
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditable ? { ...attributes, ...listeners } : {})}
    >
      <div className={isEditable && (isDragging || isReorderMode) ? "shake-inner" : ""}>
        {children}
      </div>
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

  const isPreviewPage =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/preview/");

  const isEditable = editable && !isPreviewPage;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [tempPrices, setTempPrices] = useState<Record<string, string>>({});

  const formatPrice = (value?: string) =>
    value ? Number(value).toLocaleString("ja-JP") : "";

  const handleSetCustomPrice = (id: string) => {
    if (!isEditable) return;
    const newPrice = tempPrices[id]?.trim();
    if (!newPrice) return;

    if (onReorder) {
      onReorder(
        products.map((p) =>
          p.id === id ? { ...p, customPrice: newPrice } : p
        )
      );
    }
  };

  const handleResetToDefault = (id: string) => {
    if (!isEditable) return;
    if (onReorder) {
      onReorder(
        products.map((p) => {
          if (p.id === id) {
            const newP = { ...p };
            delete newP.customPrice;
            return newP;
          }
          return p;
        })
      );
    }
    setCheckedItems((prev) => ({ ...prev, [id]: false }));
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (!isEditable) return;
    setCheckedItems((prev) => ({ ...prev, [id]: checked }));
    if (!checked) {
      setTempPrices((prev) => ({ ...prev, [id]: "" }));
    }
  };

  return (
    <>
      {/* ⭐ ここで leadText の色を白に強制 */}
      <style>
        {`
          ${globalShakeKeyframes}

          .leadtext-wrapper * {
            color: white !important;
          }
        `}
      </style>

      <div className="min-h-screen bg-black text-white flex flex-col">

        {/* HEADER */}
        <header className="text-center py-8 border-b border-gray-700">
          <img
            src="/andcollection.svg"
            alt="AND COLLECTION"
            className="mx-auto h-12 filter invert"
          />

          {leadText && (
            <div
              className="max-w-3xl mx-auto text-center mt-10 mb-5 leadtext-wrapper"
              dangerouslySetInnerHTML={{ __html: leadText }}
            />
          )}
        </header>

        {/* MAIN */}
        <main className="flex-grow max-w-7xl mx-auto px-6 py-12">
          <DndContext sensors={sensors} collisionDetection={closestCenter}>
            <SortableContext items={products.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div
                className={
                  columnCount === 2
                    ? `${styles.previewGrid} ${styles["cols-2"]}`
                    : columnCount === 4
                    ? `${styles.previewGrid} ${styles["cols-4"]}`
                    : `${styles.previewGrid} ${styles["cols-3"]}`
                }
              >
                {products.map((item) => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    isEditable={isEditable}
                    isReorderMode={isReorderMode}
                  >
                    <BlockStack gap="200">

                      {isEditable && (
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
                                    console.log("edit", item.id);
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

                      {item.imageUrl && (
                        <a
                          href={item.onlineStoreUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="block w-full object-contain"
                          />
                        </a>
                      )}

                      <div className="text-white mt-2 px-2 w-full">
                        {item.artist && <Text as="p">{item.artist}</Text>}
                        {item.title && <Text as="p">{item.title}</Text>}
                        {item.year && <Text as="p">{item.year}</Text>}
                        {item.frame && <Text as="p">{item.frame}</Text>}
                        {item.material && <Text as="p">{item.material}</Text>}
                        {item.size && <Text as="p">{item.size}</Text>}
                        {item.technique && (
                          <Text as="p">{formatTechnique(item.technique)}</Text>
                        )}
                        {item.certificate && (
                          <Text as="p">{item.certificate}</Text>
                        )}
                        {item.dimensions && (
                          <Text as="p">{item.dimensions}</Text>
                        )}
                        {item.medium && <Text as="p">{item.medium}</Text>}

                        <Text as="p" variant="bodyMd" fontWeight="medium">
                          {item.customPrice
                            ? `${formatPrice(item.customPrice)} 円（税込）`
                            : item.price
                            ? `${formatPrice(item.price)} 円（税込）`
                            : ""}
                        </Text>

                        {isEditable && (
                          <div className="mt-3 p-3 border border-gray-700 rounded w-full bg-black/40">

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
                                  value={tempPrices[item.id] || ""}
                                  onChange={(val) =>
                                    setTempPrices((prev) => ({
                                      ...prev,
                                      [item.id]: val,
                                    }))
                                  }
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
                        )}
                      </div>
                    </BlockStack>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </main>

        <footer className="text-center py-6 border-t border-gray-700 text-sm text-gray-400">
          © 2025 Clue Co.,Ltd. All rights reserved.
        </footer>
      </div>
    </>
  );
}
