// src/components/Layout.tsx
import { AppProvider, Frame } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider i18n={{}}>
      <Frame>
        {/* ✅ サイドメニュー削除済み */}
        <main style={{ width: "100%", minHeight: "100vh", background: "#fff" }}>
          {children}
        </main>
      </Frame>
    </AppProvider>
  );
}
