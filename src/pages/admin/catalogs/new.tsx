// src/pages/admin/catalogs/new.tsx
import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

export default function NewCatalogPage() {
  return (
    <AdminLayout>
      <Page title="新規カタログ作成">
        <Layout>
          {/* 左：プレビュー */}
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">プレビュー</Text>
                <Text>ここに作品プレビューが表示されます</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* 右：入力フォーム */}
          <Layout.Section secondary>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">カタログ情報</Text>
                <Text>フォームエリア</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AdminLayout>
  );
}
