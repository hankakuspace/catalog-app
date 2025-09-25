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

  useEffect(() => {
    const fetchProducts = async () => {
      const fetchWithAuth = authenticatedFetch(app);
      const res = await fetchWithAuth("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [app]);

  return (
    <div style={{ padding: 20 }}>
      <h1>✅ Shopify アプリ TOP</h1>
      <p>ここが表示されれば、認証 → exitiframe → 埋め込み表示 が成功です。</p>

      <h2>商品一覧</h2>
      {loading && <p>読み込み中...</p>}
      {!loading && products.length === 0 && <p>商品がまだ登録されていません。</p>}
      {!loading &&
        products.map((p) => (
          <div key={p.id}>
            <p>{p.title}</p>
          </div>
        ))}
    </div>
  );
}
