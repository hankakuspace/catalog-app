// src/pages/preview/[id].tsx
import { useRouter } from "next/router";
import useSWR from "swr";
import PreviewCatalog, { Product } from "@/components/PreviewCatalog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CatalogPreviewPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data, error } = useSWR(
    id ? `/api/catalogs?id=${id}` : null,
    fetcher
  );

  if (error) return <div>エラーが発生しました</div>;
  if (!data) return <div>読み込み中...</div>;

  const catalog = data.catalog;

  return (
    <PreviewCatalog
      title={catalog.title}
      leadText={catalog.leadText}
      products={catalog.products as Product[]}
      editable={false}
    />
  );
}
