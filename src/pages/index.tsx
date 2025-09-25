// src/pages/index.tsx
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { useAppBridgeCustom } from "@/lib/AppBridgeProvider";

interface Product {
  id: string;
  title: string;
}

export default function Home() {
  const app = useAppBridgeCustom();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      if (!app) {
        setError("AppBridge が初期化されていません");
        setLoading(false);
        return;
      }

      try {
        const fetchWithAuth = authenticatedFetch(app);

        // ✅ URL パラメータから shop を取得
        const params = new URLSearchParams(window.location.search);
        const shop = params.get("shop");

        const url = shop ? `/api/products?shop=${shop}` : "/api/products";
        const res = await fetchWithAuth(url);

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
