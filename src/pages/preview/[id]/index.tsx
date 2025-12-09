// src/pages/preview/[id]/index.tsx
import dynamic from "next/dynamic";

// ⚠ SSRを完全に止めるためのラッパーページ（必須）
const ClientPreview = dynamic(() => import("./client"), {
  ssr: false,
});

export default function Page() {
  return <ClientPreview />;
}
