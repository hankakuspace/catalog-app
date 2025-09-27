// src/pages/admin/index.tsx
"use client";

import { Text, Card, BlockStack } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";
import AdminContentLayout from "@/components/AdminContentLayout";

export default function AdminTop() {
  return (
    <AdminLayout>
      <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
        <Text as="h1" variant="headingLg">アプリ TOP</Text>

        <AdminContentLayout
          left={
            <Card>
              <BlockStack gap="400">
                <Text as="p">
                  ここがTOPページです。サイドメニューから画面を切り替えてください。
                </Text>
              </BlockStack>
            </Card>
          }
          right={
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">お知らせ</Text>
                <Text as="p">ここにお知らせや補足情報を表示予定</Text>
              </BlockStack>
            </Card>
          }
        />
      </div>
    </AdminLayout>
  );
}
