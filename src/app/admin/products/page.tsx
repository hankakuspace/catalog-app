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
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">商品一覧</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table className="w-full border border-gray-300 bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">ID</th>
              <th className="border p-2 text-left">タイトル</th>
              <th className="border p-2 text-left">ハンドル</th>
              <th className="border p-2 text-left">価格</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="border p-2">{p.id}</td>
                <td className="border p-2">{p.title}</td>
                <td className="border p-2">{p.handle}</td>
                <td className="border p-2">{p.price ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
