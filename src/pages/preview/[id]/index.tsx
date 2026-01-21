// src/pages/preview/[id]/index.tsx
import dynamic from "next/dynamic";
import Head from "next/head"; // ★ 追加

// ⚠ SSRを完全に止めるためのラッパーページ（必須）
const ClientPreview = dynamic(() => import("./client"), {
  ssr: false,
});

export default function Page() {
  return (
    <>
      <Head>
        <title>AND COLLECTION Private View</title>
        <link rel="icon" href="/Private-View.png?v=1" />
        <link rel="apple-touch-icon" href="/Private-View.png?v=1" />
        <link rel="shortcut icon" href="/favicon.ico" />
<link rel="icon" type="image/png" href="/icon-192x192.png" />

      </Head>

      <ClientPreview />
    </>
  );
}
