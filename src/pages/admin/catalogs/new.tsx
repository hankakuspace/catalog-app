// src/pages/admin/catalogs/new.tsx
import { useState } from "react";
import { Page, Layout, BlockStack, Text, Button, TextField, Toast } from "@shopify/polaris";

interface Product {
  id: string;
  title: string;
  artist?: string;
  imageUrl?: string;
}

export default function NewCatalog() {
  const [title, setTitle] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ active: boolean; message: string }>({
    active: false,
    message: "",
  });

  const saveCatalog = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, products: selectedProducts }),
      });
      const data = await res.json();

      if (res.ok) {
        setToast({ active: true, message: "カタログを保存しました ✅" });
        setTitle("");
        setSelectedProducts([]);
      } else {
        setToast({ active: true, message: "保存に失敗しました ❌" });
        console.error(data.error);
      }
    } catch (err) {
      setToast({ active: true, message: "エラーが発生しました ❌" });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="新規カタログ作成">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              カタログ情報
            </Text>
            <TextField
              label="カタログタイトル"
              value={title}
              onChange={setTitle}
              autoComplete="off"
            />

            <Button primary loading={saving} onClick={saveCatalog}>
              カタログ作成
            </Button>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {toast.active && (
        <Toast
          content={toast.message}
          onDismiss={() => setToast({ active: false, message: "" })}
        />
      )}
    </Page>
  );
}
