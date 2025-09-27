// src/components/AdminLayout.tsx
import { Frame, Navigation } from "@shopify/polaris";

export default function AdminLayout({ children }) {
  return (
    <Frame
      navigation={
        <Navigation location="/">
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
      {children}
    </Frame>
  );
}
