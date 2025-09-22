// src/app/admin/products/page.tsx
"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  title: string;
  imageUrl?: string | null;
  altText?: string | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  if (loading) return <p className="p-4">商品を読み込み中...</p>;

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
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-800">{p.title}</h2>
          </div>
        </div>
      ))}
    </div>
  );
}
