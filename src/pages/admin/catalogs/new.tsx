// src/pages/admin/catalogs/new.tsx
import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

export default function NewCatalogPage() {
  return (
    <AdminLayout>
      <Page title="新規カタログ作成">
        <Layout>
          {/* 左：プレビュー */}
          <Layout.Section variant="twoThirds">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">プレビュー</Text>
                <Text as="p">ここに作品プレビューが表示されます</Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* 右：入力フォーム */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">カタログ情報</Text>
                <Text as="p">フォームエリア</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AdminLayout>
  );
}
