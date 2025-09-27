// src/pages/admin/catalogs/new.tsx
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  FormLayout,
  TextField,
  Button,
} from "@shopify/polaris";

export default function NewCatalogPage() {
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Page title="新規カタログ作成">
      <Layout>
        {/* 左：プレビュー */}
        <Layout.Section oneHalf>
          <Card title="プレビュー" sectioned>
            <Text>ここに作品プレビューが表示されます</Text>
          </Card>
        </Layout.Section>

        {/* 右：入力フォーム */}
        <Layout.Section oneHalf>
          <Card title="カタログ情報" sectioned>
            <FormLayout>
              <TextField
                label="Title（顧客向け表示名）"
                value={title}
                onChange={setTitle}
                autoComplete="off"
              />
              <TextField
                label="Label（管理用ラベル）"
                value={label}
                onChange={setLabel}
                autoComplete="off"
              />
              <TextField
                label="作品検索"
                value={searchQuery}
                onChange={setSearchQuery}
                autoComplete="off"
              />
              <Button primary>保存</Button>
            </FormLayout>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
