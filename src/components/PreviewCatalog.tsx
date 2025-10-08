// src/components/PreviewCatalog.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
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
  columnCount?: number;
}

// ✅ 内側ラッパーを揺らす安全なshakeアニメーション
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: editable ? "grab" : "default",
    zIndex: isDragging ? 50 : "auto",
  };

  // DnD中 or Moveモード中に shake
  const shakeActive = editable && (isDragging || isReorderMode);

  return (
    <div ref={setNodeRef} style={style} {...(editable ? { ...attributes, ...listeners } : {})}>
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

  const handleDragEnd = (event: DragEndEvent) => {
    if (!editable || !onReorder) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(products, oldIndex, newIndex));
    }
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
      {/* アニメーション定義 */}
      <style>{globalShakeKeyframes}</style>

      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* ヘッダー */}
        <header className="text-center py-8 border-b border-gray-700">
          <img
            src="/andcollection.svg"
            alt="AND COLLECTION"
            className="mx-auto h-12 w-auto filter invert"
          />
          {sanitizedLead && (
            <div
              className="max-w-3xl mx-auto text-center mt-10 mb-5"
              style={{ color: "#fff" }}
              dangerouslySetInnerHTML={{ __html: sanitizedLead }}
            />
          )}
        </header>

        {/* メイン */}
        <main className="flex-grow max-w-7xl mx-auto px-6 py-12">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={products.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className={gridClass}>
                {products.map((item) => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    editable={editable}
                    isReorderMode={isReorderMode}
                  >
                    <BlockStack gap="200">
                      {/* 編集メニュー */}
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
                      )}

                      {/* 画像 */}
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="block w-full object-contain"
                        />
                      )}

                      {/* テキスト */}
                      <div className="text-white mt-2 px-2">
                        {item.artist && <Text as="p">{item.artist}</Text>}
                        {item.title && <Text as="p">{item.title}</Text>}
                        {item.year && <Text as="p">{item.year}</Text>}
                        {item.dimensions && <Text as="p">{item.dimensions}</Text>}
                        {item.medium && <Text as="p">{item.medium}</Text>}
                        {item.price && <Text as="p">{item.price} 円（税込）</Text>}
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
