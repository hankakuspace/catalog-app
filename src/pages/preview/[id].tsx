// src/pages/preview/[id].tsx
import { useEffect, useState } from "react";

interface Product {
  id: string;
  title: string;
  price?: string;
  imageUrl?: string;
}

interface Catalog {
  id: string;
  title: string;
  products: Product[];
  createdAt: string;
  previewUrl: string;
}

export default function PublicCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const id = window.location.pathname.split("/").pop();
        if (!id) return;

        const res = await fetch(`/api/catalogs/${id}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data && data.catalog) {
          setCatalog(data.catalog);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (!catalog) return <div className="text-center p-10">カタログが見つかりませんでした</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* タイトル */}
        <h1 className="text-4xl font-bold text-center mb-12">{catalog.title}</h1>

        {/* 商品グリッド */}
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {catalog.products?.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1 flex flex-col"
            >
              {/* 商品画像 */}
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  className="w-full h-64 object-cover rounded-t-xl"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-t-xl">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}

              {/* 商品情報 */}
              <div className="p-4 flex flex-col flex-grow">
                <h2 className="text-lg font-semibold mb-2">{p.title}</h2>
                {p.price && (
                  <p className="text-gray-600 mt-auto">{Number(p.price).toLocaleString()}円</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
