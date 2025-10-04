// src/components/AdminLayout.tsx
import { Frame } from "@shopify/polaris";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <Frame>
      {/* ✅ サイドメニューを完全に削除 */}
      <main
        style={{
          width: "100%",
          minHeight: "100vh",
          backgroundColor: "#fff",
          padding: "20px",
          margin: 0,
        }}
      >
        {children}
      </main>
    </Frame>
  );
}
