// src/components/PreviewCatalog.tsx
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react"; // ★ useCallback 追加
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
  arrayMove,
} from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  BlockStack,
  Text,
  Popover,
  ActionList,
  Button,
  TextField,
  Checkbox,
  Icon,
} from "@shopify/polaris";
import { MenuHorizontalIcon, XIcon } from "@shopify/polaris-icons";
import styles from "@/pages/admin/catalogs/new.module.css";

export interface Product {
  id: string;
  title: string;
  price?: string;
  customPrice?: string;
  imageUrl?: string;
  imageUrls?: string[];
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

const getProductImageUrls = (product: Product) => {
  if (product.imageUrls && product.imageUrls.length > 0) {
    return product.imageUrls.filter(Boolean);
  }

  if (product.imageUrl) {
    return [product.imageUrl];
  }

  return [];
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
      <div
        className={
          isEditable && (isDragging || isReorderMode) ? "shake-inner" : ""
        }
      >
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
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);
  const [lightboxProductIndex, setLightboxProductIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (product: Product, productIndex = 0) => {
    const imageUrls = getProductImageUrls(product);
    if (imageUrls.length === 0) return;

    setLightboxProduct(product);
    setLightboxProductIndex(productIndex);
    setLightboxIndex(0);
  };

  const closeLightbox = useCallback(() => {
    setLightboxProduct(null);
    setLightboxProductIndex(0);
    setLightboxIndex(0);
  }, []);

  const showPrevProduct = useCallback(() => {
    if (!products.length) return;

    const prevIndex =
      lightboxProductIndex === 0 ? products.length - 1 : lightboxProductIndex - 1;

    setLightboxProduct(products[prevIndex]);
    setLightboxProductIndex(prevIndex);
    setLightboxIndex(0);
  }, [products, lightboxProductIndex]);

  const showNextProduct = useCallback(() => {
    if (!products.length) return;

    const nextIndex =
      lightboxProductIndex === products.length - 1 ? 0 : lightboxProductIndex + 1;

    setLightboxProduct(products[nextIndex]);
    setLightboxProductIndex(nextIndex);
    setLightboxIndex(0);
  }, [products, lightboxProductIndex]);

  const showPrevImage = useCallback(() => {
    if (!lightboxProduct) return;

    const imageUrls = getProductImageUrls(lightboxProduct);
    if (imageUrls.length <= 1) return;

    setLightboxIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  }, [lightboxProduct]);

  const showNextImage = useCallback(() => {
    if (!lightboxProduct) return;

    const imageUrls = getProductImageUrls(lightboxProduct);
    if (imageUrls.length <= 1) return;

    setLightboxIndex((prev) =>
      prev === imageUrls.length - 1 ? 0 : prev + 1
    );
  }, [lightboxProduct]);

  const formatPrice = (value?: string) =>
    value ? Number(value).toLocaleString("ja-JP") : "";

  /* ================================
   * ★ catalog-image 高さ揃え
   * ================================ */
  const imageRefs = useRef<HTMLDivElement[]>([]);

  // ★ 追加：高さ計測関数を useCallback 化（既存ロジックは変更なし）
  const applySameHeight = useCallback(() => {
    if (!imageRefs.current.length) return;

    imageRefs.current.forEach((el) => {
      if (el) el.style.height = "auto";
    });

    const heights = imageRefs.current.map(
      (el) => el?.getBoundingClientRect().height || 0
    );
    const maxHeight = Math.max(...heights);

    if (maxHeight > 0) {
      imageRefs.current.forEach((el) => {
        if (el) el.style.height = `${maxHeight}px`;
      });
    }
  }, []);

  useEffect(() => {
    if (!imageRefs.current.length) return;

    const observer = new ResizeObserver(() => {
      applySameHeight();
    });

    imageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    // 初回実行
    window.requestAnimationFrame(applySameHeight);

    return () => {
      observer.disconnect();
    };
  }, [products, columnCount, applySameHeight]);
  /* ================================ */

  useEffect(() => {
    if (!lightboxProduct) return;

    const handleLightboxKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (event.key === "ArrowLeft") {
        showPrevProduct();
        return;
      }

      if (event.key === "ArrowRight") {
        showNextProduct();
      }
    };

    window.addEventListener("keydown", handleLightboxKeyDown);

    return () => {
      window.removeEventListener("keydown", handleLightboxKeyDown);
    };
  }, [lightboxProduct, closeLightbox, showPrevProduct, showNextProduct]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorder) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newProducts = arrayMove(products, oldIndex, newIndex);
    onReorder(newProducts);
  };

  const handleSetCustomPrice = (id: string) => {
    if (!isEditable) return;
    const newPrice = tempPrices[id]?.trim();
    if (!newPrice) return;

    onReorder?.(
      products.map((p) =>
        p.id === id ? { ...p, customPrice: newPrice } : p
      )
    );
  };

  const handleResetToDefault = (id: string) => {
    if (!isEditable) return;

    onReorder?.(
      products.map((p) => {
        if (p.id === id) {
          const newP = { ...p };
          delete newP.customPrice;
          return newP;
        }
        return p;
      })
    );

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
      <style>
        {`
          ${globalShakeKeyframes}

          .leadtext-wrapper * {
            color: white !important;
          }

          .catalog-card {
            display: grid;
            grid-template-rows: auto auto;
            height: 100%;
          }

          .catalog-image {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .catalog-image img {
            max-height: 100%;
            width: 100%;
            object-fit: contain;
          }

          .catalog-image button,
          .catalog-image button img {
            cursor: zoom-in;
          }
        `}
      </style>

        {lightboxProduct && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={closeLightbox}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "#ffffff",
              zIndex: 9999,
            }}
          >
            <button
              type="button"
              onClick={closeLightbox}
              style={{
                position: "fixed",
                top: "18px",
                right: "18px",
                zIndex: 10001,
                background: "none",
                border: "none",
                color: "#777",
                cursor: "pointer",
                padding: "8px",
                lineHeight: 1,
              }}
              aria-label="閉じる"
            >
              <Icon source={XIcon} />
            </button>

            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "calc(100vw - 48px)",
                height: "calc(100vh - 48px)",
                margin: "24px",
                background: "#ffffff",
                display: "grid",
                gridTemplateColumns: "minmax(620px, 760px) 320px",
                justifyContent: "center",
                columnGap: "78px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  padding: "36px 0",
                  background: "#ffffff",
                  minWidth: 0,
                }}
              >
                <img
                  src={getProductImageUrls(lightboxProduct)[lightboxIndex]}
                  alt={lightboxProduct.title}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "calc(100vh - 120px)",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>

              <div
                style={{
                  background: "#ffffff",
                  color: "#444",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  minWidth: 0,
                  position: "relative",
                }}
              >
                <div style={{ maxWidth: "240px" }}>
                  {lightboxProduct.artist && (
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#000", lineHeight: 1.6, marginBottom: "4px" }}>
                      {lightboxProduct.artist}
                    </div>
                  )}

                  {lightboxProduct.title && (
                    <div style={{ fontSize: "15px", fontWeight: 500, color: "#000", lineHeight: 1.6, marginBottom: "10px" }}>
                      {lightboxProduct.title}
                    </div>
                  )}

                  {lightboxProduct.year && (
                    <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7 }}>
                      {lightboxProduct.year}
                    </div>
                  )}

                  {lightboxProduct.material && (
                    <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7 }}>
                      {lightboxProduct.material}
                    </div>
                  )}

                  {lightboxProduct.size && (
                    <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7 }}>
                      {lightboxProduct.size}
                    </div>
                  )}

                  {lightboxProduct.technique && (
                    <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7 }}>
                      {formatTechnique(lightboxProduct.technique)}
                    </div>
                  )}

                  {lightboxProduct.dimensions && (
                    <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7 }}>
                      {lightboxProduct.dimensions}
                    </div>
                  )}

                  {lightboxProduct.medium && (
                    <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7 }}>
                      {lightboxProduct.medium}
                    </div>
                  )}

                  {(lightboxProduct.customPrice || lightboxProduct.price) && (
                    <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.7, marginTop: "6px" }}>
                      {lightboxProduct.customPrice
                        ? `${formatPrice(lightboxProduct.customPrice)} 円（税込）`
                        : lightboxProduct.price
                        ? `${formatPrice(lightboxProduct.price)} 円（税込）`
                        : ""}
                    </div>
                  )}

                  <div style={{ marginTop: "20px", width: "110px", borderTop: "1px solid #e5e5e5" }} />
                </div>

                <div
                  style={{
                    position: "fixed",
                    right: "40px",
                    bottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    fontSize: "13px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#666",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeLightbox}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#666",
                      fontSize: "13px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    CLOSE
                  </button>
                  {products.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={showPrevProduct}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          color: "#666",
                          fontSize: "20px",
                          lineHeight: 1,
                        }}
                        aria-label="前の作品"
                      >
                        ‹
                      </button>
                      <span>
                        {lightboxProductIndex + 1} of {products.length}
                      </span>
                      <button
                        type="button"
                        onClick={showNextProduct}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          color: "#666",
                          fontSize: "20px",
                          lineHeight: 1,
                        }}
                        aria-label="次の作品"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      <div className="min-h-screen bg-black text-white flex flex-col">
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
              <div
                className={
                  columnCount === 2
                    ? `${styles.previewGrid} ${styles["cols-2"]}`
                    : columnCount === 4
                    ? `${styles.previewGrid} ${styles["cols-4"]}`
                    : `${styles.previewGrid} ${styles["cols-3"]}`
                }
              >
                {products.map((item, index) => (
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
                                    ? "移動を完了"
                                    : "移動",
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

                      <div className="catalog-card">
                        <div
                          className="catalog-image"
                          ref={(el) => {
                            if (el) imageRefs.current[index] = el;
                          }}
                        >
                          {item.imageUrl &&
                            (isEditable ? (
                              <a
                                href={item.onlineStoreUrl ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  // ★ 追加：画像ロード後に再計測
                                  onLoad={() => {
                                    requestAnimationFrame(applySameHeight);
                                  }}
                                />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openLightbox(item, index)}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "zoom-in",
                                }}
                              >
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  style={{ cursor: "zoom-in" }}
                                  // ★ 追加：画像ロード後に再計測
                                  onLoad={() => {
                                    requestAnimationFrame(applySameHeight);
                                  }}
                                />
                              </button>
                            ))}
                        </div>

                        <div className="text-white mt-3 px-2 w-full">
                          {item.artist && <Text as="p">{item.artist}</Text>}
                          {item.title && <Text as="p">{item.title}</Text>}
                          {item.year && <Text as="p">{item.year}</Text>}
                          {item.frame && <Text as="p">{item.frame}</Text>}
                          {item.material && (
                            <Text as="p">{item.material}</Text>
                          )}
                          {item.size && <Text as="p">{item.size}</Text>}
                          {item.technique && (
                            <Text as="p">
                              {formatTechnique(item.technique)}
                            </Text>
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
                              ? `${formatPrice(
                                  item.customPrice
                                )} 円（税込）`
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
                                    onClick={() =>
                                      handleSetCustomPrice(item.id)
                                    }
                                  >
                                    変更する
                                  </Button>

                                  <Button
                                    variant="monochromePlain"
                                    onClick={() =>
                                      handleResetToDefault(item.id)
                                    }
                                  >
                                    元の価格に戻す
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
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
