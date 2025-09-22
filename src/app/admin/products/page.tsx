// src/app/admin/products/page.tsx
"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  title: string;
  handle: string;
  price?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("❌ 商品取得エラー:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <main>
      <h1 className="text-2xl font-bold mb-8">商品一覧</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-500">商品が登録されていません。</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
            >
              {/* ダミー画像: 実際は Shopify API から image を取る */}
              <div className="bg-gray-100 h-48 flex items-center justify-center text-gray-400">
                No Image
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-lg mb-1">{p.title}</h2>
                <p className="text-sm text-gray-500 mb-2">@{p.handle}</p>
                <p className="text-base font-bold">
                  {p.price ? `¥${p.price}` : "価格未設定"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
