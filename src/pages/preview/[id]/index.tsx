// src/pages/preview/[id]/index.tsx
import dynamic from "next/dynamic";

// ⭐ Preview ページ全体をクライアント専用化するために dynamic import（SSR無効化）
const ClientPreview = dynamic(() => import("./client"), {
  ssr: false,
});

export default function Page() {
  return <ClientPreview />;
}
