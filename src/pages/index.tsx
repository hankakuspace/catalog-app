// src/pages/index.tsx
import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticatedFetch } from "@shopify/app-bridge-utils";

interface Product {
  id: string;
  title: string;
}

export default function Home() {
  const app = useAppBridge();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const fetchWithAuth = authenticatedFetch(app);
        const res = await fetchWithAuth("/api/products");

        if (!res.ok) {
          throw new Error(`Failed to fetch products: ${res.status}`);
        }

        const data = await res.json();
        setProducts(data.products || []);
      } catch (err: any) {
        setError(err.message || "Error loading products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [app]);

  return (
    <div style={{ padding: 20 }}>
      <h1>✅ Shopify アプリ TOP</h1>
      <p>ここが表示されれば、認証 → exitiframe → 埋め込み表示 が成功です。</p>

      <h2>商品一覧</h2>
      {loading && <p>読み込み中...</p>}
      {error && <p st
