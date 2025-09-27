// src/pages/admin/catalogs/index.tsx
"use client";

import { Text, Card, BlockStack } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";
import AdminContentLayout from "@/components/AdminContentLayout";

export default function CatalogListPage() {
  return (
    <AdminLayout>
      <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
        <Text as="h1" variant="headingLg">カタログ一覧</Text>

        <AdminContentLayout
          left={
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">カタログリスト</Text>
                <Text as="p">ここに Firestore から取得したカタログ一覧を表示します。</Text>
              </BlockStack>
            </Card>
          }
          right={
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">フィルタ</Text>
                <Text as="p">検索や絞り込み機能をここに追加予定です。</Text>
              </BlockStack>
            </Card>
          }
        />
      </div>
    </AdminLayout>
  );
}
