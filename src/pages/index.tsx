// src/pages/index.tsx
import { useEffect, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import type { ClientApplication } from "@shopify/app-bridge";
import type { AppBridgeState } from "@shopify/app-bridge-core/actions/AppBridgeState";

interface Product {
  id: string;
  title: string;
}

export default function Home() {
  const app = useAppBridge() as unknown as ClientApplication<AppBridgeState>;
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

        const data: { products?: Product[] } = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error loading products");
        }
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
      {error && <p style={{ color: "red" }}>エラー: {error}</p>}
      {!loading && !error && products.length === 0 && (
        <p>商品がまだ登録されていません。</p>
      )}
      {!loading && !error && products.length > 0 && (
        <ul>
          {products.map((p) => (
            <li key={p.id}>{p.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
