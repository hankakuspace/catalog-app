// src/components/PreviewCatalog.tsx
import React from "react";

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
}

export default function PreviewCatalog({ title, leadText, products }: Props) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* ヘッダー */}
      <header className="text-center py-8 border-b border-gray-700">
        {/* 白化したロゴ */}
        <img
          src="/andcollection.svg"
          alt="AND COLLECTION"
          className="mx-auto h-12 w-auto filter invert"
        />

        {/* タイトル */}
        <h2 className="text-2xl font-medium mt-16 mb-16">
          {title || "（タイトル未設定）"}
        </h2>

        {/* リード文 */}
        {leadText && (
          <p className="max-w-3xl mx-auto whitespace-pre-line text-center text-lg leading-relaxed">
            {leadText}
          </p>
        )}
      </header>

      {/* メイン */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white text-black rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1 flex flex-col h-full"
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  className="block w-full h-80 object-contain bg-gray-100 border-b border-gray-200 rounded-t-xl"
                />
              ) : (
                <div className="w-full h-80 bg-gray-200 flex items-center justify-center rounded-t-xl">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}

              <div className="p-4 flex flex-col flex-grow">
                <h2 className="text-lg font-semibold mb-1">{p.title}</h2>
                {p.artist && <p className="text-sm text-gray-600 mb-1">{p.artist}</p>}
                {p.year && <p className="text-sm text-gray-600 mb-1">{p.year}</p>}
                {p.dimensions && <p className="text-sm text-gray-600 mb-1">{p.dimensions}</p>}
                {p.medium && <p className="text-sm text-gray-600 mb-1">{p.medium}</p>}
                {p.frame && <p className="text-sm text-gray-600 mb-1">{p.frame}</p>}
                {p.price && (
                  <p className="text-base font-medium text-gray-800 mt-auto">
                    {Number(p.price).toLocaleString()} 円（税込）
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* フッター */}
      <footer className="text-center py-6 border-t border-gray-700 text-sm text-gray-400">
        Copyright © 2025 Clue Co.,Ltd. all rights reserved.
      </footer>
    </div>
  );
}
