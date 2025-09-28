// src/components/AdminLayout.tsx
import { Frame, Navigation } from "@shopify/polaris";
import { ReactNode } from "react";
import { useRouter } from "next/router";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();

  return (
    <Frame
      navigation={
        <Navigation location={router.pathname}>
          <Navigation.Section
            items={[
              { label: "TOP", url: "/admin" },
              { label: "カタログ一覧", url: "/admin/catalogs" },
              { label: "新規カタログ作成", url: "/admin/catalogs/new" },
            ]}
          />
        </Navigation>
      }
    >
      {/* 🔹 maxWidth制限を解除してブラウザ幅いっぱいに */}
      <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
        {children}
      </div>
    </Frame>
  );
}
