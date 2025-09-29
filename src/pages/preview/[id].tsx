// src/pages/preview/[id].tsx
import { useEffect, useState } from "react";

interface Product {
  id: string;
  title: string;
  price?: string;
  imageUrl?: string;
  artist?: string;
}

interface Catalog {
  id: string;
  title: string;
  products: Product[];
  previewUrl: string;
  createdAt: any;
}

export default function PublicCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const id = window.location.pathname.split("/").pop();
        console.log("📌 PreviewPage id:", id);
        if (!id) return;

        const res = await fetch(`/api/catalogs/${id}`);
        console.log("📌 API status:", res.status);
        const data = await res.json();
        console.log("📌 API response:", data);

        if (data?.catalog) {
          setCatalog(data.catalog);
        } else {
          setCatalog(null);
        }
      } catch (err) {
        console.error("❌ fetch error:", err);
        setCatalog(null);
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
        <h1 className="text-4xl font-bold text-center mb-12">{catalog.title}</h1>

        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {catalog.products?.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-1 flex flex-col"
            >
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
              <div className="p-4 flex flex-col flex-grow">
                <h2 className="text-lg font-semibold mb-2">{p.title}</h2>
                {p.artist && <p className="text-sm text-gray-500">{p.artist}</p>}
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
