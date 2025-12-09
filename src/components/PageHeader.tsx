// src/components/PageHeader.tsx
import { Text } from "@shopify/polaris";
import AdminHeader from "@/components/AdminHeader";

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      {/* ✅ フォント・余白を全ページ共通 */}
      <Text as="h1" variant="headingLg">
        {title}
      </Text>
      <div style={{ marginTop: "4px" }}>
        <AdminHeader />
      </div>
    </div>
  );
}
