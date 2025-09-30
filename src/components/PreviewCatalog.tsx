// src/components/PreviewCatalog.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Card,
  BlockStack,
  Text,
  Popover,
  ActionList,
  Button,
} from "@shopify/polaris";
import { MenuHorizontalIcon } from "@shopify/polaris-icons";
import styles from "@/pages/admin/catalogs/new.module.css";

export interface Product {
  id: string;
  title: string;
  price?: string;
  imageUrl?: string;
  artist?: string;
  year?: string;
  dimensions?: string;
  medium?: string;
  frame?: string;
}

interface Props {
  title: string;
  leadText?: string;
  products: Product[];
  editable?: boolean;
  onReorder?: (products: Product[]) => void;
  onRemove?: (id: string) => void;
  columnCount?: number; // ✅ ← これを追加
}

function SortableItem({
  id,
  isReorderMode,
  editable,
  children,
}: {
  id: string;
  isReorderMode: boolean;
  editable: boolean;
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

  const shakeClass =
    editable && (isReorderMode || isDragging) ? styles.shakeWrapper : "";

  return (
    <div ref={setNodeRef} style={style} {...(editable ? attributes : {})} {...(editable ? listeners : {})}>
      <div className={`${shakeClass}`} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
  columnCount = 3, // ✅ 受け取れるようにする
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);

  // ✅ 高さ揃え
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const maxHeightRef = useRef(0);

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
    if (products.length > 0) {
      adjustHeights();
      window.addEventListener("resize", adjustHeights);
      return () => window.removeEventListener("resize", adjustHeights);
    }
  }, [products, adjustHeights]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!editable || !onReorder) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(products, oldIndex, newIndex));
    }
  };

  // ✅ 列数に応じてクラス切替
  const gridClass =
    columnCount === 2
      ? `${styles.previewGrid} ${styles["cols-2"]}`
      : columnCount === 4
      ? `${styles.previewGrid} ${styles["cols-4"]}`
      : `${styles.previewGrid} ${styles["cols-3"]}`;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="text-center py-8 border-b border-gray-700">
        <img src="/andcollection.svg" alt="AND COLLECTION" className="mx-auto h-12 w-auto filter invert" />
        <h2 className="text-2xl font-medium mt-10 mb-2 text-white">
          {title || "（タイトル未設定）"}
        </h2>
        {leadText && (
          <div
            className="max-w-3xl mx-auto text-center mt-5 mb-5 text-white"
            dangerouslySetInnerHTML={{ __html: leadText }}
          />
        )}
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12">
        {editable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={products.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className={gridClass}>
                {/* ✅ カード描画部分は既存のまま */}
                {products.map((item, index) => (
                  <SortableItem key={item.id} id={item.id} isReorderMode={isReorderMode} editable={editable}>
                    <div className={styles.cardWrapper}>
                      <Card>
                        <div
                          className={styles.cardInner}
                          ref={(el) => {
                            cardRefs.current[index] = el;
                          }}
                        >
                          <BlockStack gap="200">
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <div className="text-black">
                                <Text as="h3" variant="headingSm">
                                  {item.artist}
                                </Text>
                              </div>
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
                                      content: isReorderMode ? "Finish move" : "Move item",
                                      onAction: () => {
                                        setIsReorderMode(!isReorderMode);
                                        setActivePopoverId(null);
                                      },
                                    },
                                    {
                                      destructive: true,
                                      content: "Remove",
                                      onAction: () => {
                                        if (onRemove) onRemove(item.id);
                                        setActivePopoverId(null);
                                      },
                                    },
                                  ]}
                                />
                              </Popover>
                            </div>
                            {/* 画像 + 詳細 */}
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="block w-full h-80 object-contain bg-gray-100 border-b border-gray-200 rounded-t-xl"
                                onLoad={adjustHeights}
                              />
                            ) : (
                              <div className="w-full h-80 bg-gray-200 flex items-center justify-center rounded-t-xl">
                                <span className="text-gray-400">No Image</span>
                              </div>
                            )}
                            <div className="text-black">
                              <Text as="p">{item.title}</Text>
                              {item.year && <Text as="p">{item.year}</Text>}
                              {item.dimensions && <Text as="p">{item.dimensions}</Text>}
                              {item.medium && <Text as="p">{item.medium}</Text>}
                              {item.price && <Text as="p">{item.price} 円（税込）</Text>}
                            </div>
                          </BlockStack>
                        </div>
                      </Card>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className={gridClass}>
            {/* 公開モード */}
            {products.map((item, index) => (
              <div key={item.id} className={styles.cardWrapper}>
                <Card>
                  <div
                    className={styles.cardInner}
                    ref={(el) => {
                      cardRefs.current[index] = el;
                    }}
                  >
                    <BlockStack gap="200">
                      <div className="text-black">
                        <Text as="h3" variant="headingSm">
                          {item.artist}
                        </Text>
                      </div>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="block w-full h-80 object-contain bg-gray-100 border-b border-gray-200 rounded-t-xl"
                          onLoad={adjustHeights}
                        />
                      ) : (
                        <div className="w-full h-80 bg-gray-200 flex items-center justify-center rounded-t-xl">
                          <span className="text-gray-400">No Image</span>
                        </div>
                      )}
                      <div className="text-black">
                        <Text as="p">{item.title}</Text>
                        {item.year && <Text as="p">{item.year}</Text>}
                        {item.dimensions && <Text as="p">{item.dimensions}</Text>}
                        {item.medium && <Text as="p">{item.medium}</Text>}
                        {item.price && <Text as="p">{item.price} 円（税込）</Text>}
                      </div>
                    </BlockStack>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 border-t border-gray-700 text-sm text-gray-400">
        Copyright © 2025 Clue Co.,Ltd. all rights reserved.
      </footer>
    </div>
  );
}
