// src/pages/admin/index.tsx
import { Page, Text } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

export default function AdminTop() {
  return (
    <AdminLayout>
      <Page title="アプリ TOP">
        <Text>ここがTOPページです。サイドメニューから画面を切り替えてください。</Text>
      </Page>
    </AdminLayout>
  );
}
