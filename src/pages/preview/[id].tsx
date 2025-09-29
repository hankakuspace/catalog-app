// src/pages/preview/[id].tsx
"use client";

import { useEffect, useState } from "react";

interface Catalog {
  id: string;
  title: string;
  products: any[];
  createdAt: string;
  previewUrl: string;
}

export default function PreviewPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const id = window.location.pathname.split("/").pop();
        if (!id) {
          setCatalog(null);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/catalogs/get?id=${id}`);
        if (!res.ok) {
          setCatalog(null);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data && data.catalog) {
          setCatalog(data.catalog);
        } else {
          setCatalog(null);
        }
      } catch (error) {
        console.error("Error fetching catalog:", error);
        setCatalog(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  // ✅ 条件分岐の整理
  if (loading) {
    return <p>Loading...</p>;
  }

  if (!catalog) {
    return <p>カタログが見つかりませんでした</p>;
  }

  return (
    <div>
      <h1>{catalog.title}</h1>
      <ul>
        {catalog.products?.map((p, idx) => (
          <li key={idx}>{p.title}</li>
        ))}
      </ul>
    </div>
  );
}
