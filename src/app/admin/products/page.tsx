// src/app/admin/products/page.tsx
"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  title: string;
  imageUrl: string | null;
  altText: string;
  price: string | null;
  inventory: number | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid API response");
        setProducts(data);
      } catch (err: unknown) {
        console.error("Failed to load products:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  if (loading) return <p className="p-4">商品を読み込み中...</p>;
  if (error) return <p className="p-4 text-red-600">エラー: {error}</p>;

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((p) => (
        <div
          key={p.id}
          className="bg-white rounded-xl shadow-md overflow-hidden border hover:shadow-lg transition"
        >
          <div className="aspect-w-1 aspect-h-1 bg-gray-100">
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt={p.altText || p.title}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No Image
              </div>
            )}
          </div>
          <div className="p-4 space-y-1">
            <h2 className="text-sm font-semibold text-gray-800">{p.title}</h2>
            <p className="text-sm text-gray-600">
              価格: {p.price ? `¥${p.price}` : "不明"}
            </p>
            <p
              className={`text-xs font-medium ${
                p.inventory && p.inventory > 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {p.inventory && p.inventory > 0
                ? `在庫あり (${p.inventory})`
                : "在庫なし"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
