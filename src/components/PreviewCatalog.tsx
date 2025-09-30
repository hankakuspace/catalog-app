// src/components/PreviewCatalog.tsx
/* eslint-disable @next/next/no-img-element */
import React from "react";
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
import "react-quill/dist/quill.snow.css"; // ReactQuillのスタイルをプレビューでも反映

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
  leadText?: string; // HTML文字列
  products: Product[];
  onReorder?: (products: Product[]) => void; // ← optional に修正
}

function SortableProductCard({ product }: { product: Product }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    opacity: isDragging ? 0.5 : 1,
    animation: isDragging ? "shake 0.3s ease-in-out infinite" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white text-black rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1 flex flex-col h-full"
    >
      {/* 商品画像 */}
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.title}
          className="block w-full h-80 object-contain bg-gray-100 border-b border-gray-200 rounded-t-xl"
        />
      ) : (
        <div className="w-full h-80 bg-gray-200 flex items-center justify-center rounded-t-xl">
          <span className="text-gray-400">No Image</span>
        </div>
      )}

      {/* 商品情報 */}
      <div className="p-4 flex flex-col flex-grow">
        <h2 className="text-lg font-semibold mb-1">{product.title}</h2>
        {product.artist && <p className="text-sm text-gray-600 mb-1">{product.artist}</p>}
        {product.year && <p className="text-sm text-gray-600 mb-1">{product.year}</p>}
        {product.dimensions && <p className="text-sm text-gray-600 mb-1">{product.dimensions}</p>}
        {product.medium && <p className="text-sm text-gray-600 mb-1">{product.medium}</p>}
        {product.frame && <p className="text-sm text-gray-600 mb-1">{product.frame}</p>}
        {product.price && (
          <p className="text-base font-medium text-gray-800 mt-auto">
            {Number(product.price).toLocaleString()} 円（税込）
          </p>
        )}
      </div>
    </div>
  );
}

export default function PreviewCatalog({ title, leadText, products, onReorder }: Props) {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorder) return; // 公開プレビューではDnD無効
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(products, oldIndex, newIndex));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* ヘッダー */}
      <header className="text-center py-8 border-b border-gray-700">
        <img
          src="/andcollection.svg"
          alt="AND COLLECTION"
          className="mx-auto h-12 w-auto filter invert"
        />

        <h2 className="text-2xl font-medium mt-10 mb-2">
          {title || "（タイトル未設定）"}
        </h2>

        {leadText && (
          <div
            className="max-w-3xl mx-auto text-center mt-5 mb-5"
            dangerouslySetInnerHTML={{ __html: leadText }}
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
          <SortableContext items={products.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <SortableProductCard key={p.id} product={p} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* フッター */}
      <footer className="text-center py-6 border-t border-gray-700 text-sm text-gray-400">
        Copyright © 2025 Clue Co.,Ltd. all rights reserved.
      </footer>

      {/* shake animation */}
      <style jsx global>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          75% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
