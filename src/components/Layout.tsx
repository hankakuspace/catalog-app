// src/components/Layout.tsx
import { AppProvider, Frame } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider i18n={{}}>
      {/* ✅ Frameに navigation プロパティを一切渡さない */}
      <Frame>
        {/* ✅ フルブラウザ幅で表示 */}
        <main
          style={{
            width: "100%",
            minHeight: "100vh",
            backgroundColor: "#fff",
            padding: 0,
            margin: 0,
          }}
        >
          {children}
        </main>
      </Frame>
    </AppProvider>
  );
}
