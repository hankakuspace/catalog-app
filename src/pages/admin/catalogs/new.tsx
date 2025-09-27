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
            <Card>
              <Card.Header title="プレビュー" />
              <Card.Section>
                <Text>ここに作品プレビューが表示されます</Text>
              </Card.Section>
            </Card>
          </Layout.Section>

          {/* 右：入力フォーム */}
          <Layout.Section secondary>
            <Card>
              <Card.Header title="カタログ情報" />
              <Card.Section>
                <Text>フォームエリア</Text>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AdminLayout>
  );
}
