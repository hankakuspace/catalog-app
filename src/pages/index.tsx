// src/pages/index.tsx
import { TitleBar } from "@shopify/app-bridge-react";

export default function Home() {
  return (
    <div style={{ padding: 20 }}>
      <TitleBar title="Catalog App" />
      <h1>✅ Shopify アプリ TOP</h1>
      <p>ここが表示されれば、認証 → exitiframe → 埋め込み表示 が成功です。</p>
    </div>
  );
}
