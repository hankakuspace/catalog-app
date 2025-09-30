// src/pages/preview/[id].tsx
import { useEffect, useState } from "react";
import PreviewCatalog, { Product } from "@/components/PreviewCatalog";

interface Catalog {
  id: string;
  title: string;
  products: Product[];
  previewUrl: string;
  createdAt: { _seconds: number; _nanoseconds: number } | string;
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
        const data = await res.json();

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

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );

  if (!catalog)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        カタログが見つかりませんでした
      </div>
    );

  return <PreviewCatalog title={catalog.title} products={catalog.products || []} />;
}
