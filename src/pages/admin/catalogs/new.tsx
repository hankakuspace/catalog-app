// src/pages/admin/catalogs/new.tsx
import { Page, Layout, Card, Text } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

export default function NewCatalogPage() {
  return (
    <AdminLayout>
      <Page title="新規カタログ作成">
        <Layout>
          {/* 左：プレビュー */}
          <Layout.Section>
            <Card title="プレビュー" sectioned>
              <Text>ここに作品プレビューが表示されます</Text>
            </Card>
          </Layout.Section>

          {/* 右：入力フォーム */}
          <Layout.Section secondary>
            <Card title="カタログ情報" sectioned>
              <Text>フォームエリア</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AdminLayout>
  );
}
