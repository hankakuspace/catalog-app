// src/pages/preview/[id].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import {
  Card,
  Text,
  TextField,
  Button,
  BlockStack,
  Banner,
  Spinner,
} from "@shopify/polaris";
import PreviewCatalog, { Product } from "@/components/PreviewCatalog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CatalogPreviewPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data, error } = useSWR(
    id ? `/api/catalogs?id=${id}` : null,
    fetcher
  );

  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [inputUser, setInputUser] = useState("");
  const [inputPass, setInputPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // 認証状態チェック
  useEffect(() => {
    if (!data?.catalog || !id) return;
    const catalog = data.catalog;
    if (catalog.username && catalog.password) {
      const saved = localStorage.getItem(`catalog-auth-${id}`);
      if (saved === "ok") {
        setIsAuthed(true);
      }
    } else {
      setIsAuthed(true); // 認証不要
    }
    setAuthChecked(true);
  }, [data, id]);

  const handleLogin = () => {
    const catalog = data?.catalog;
    if (!catalog) return;
    if (
      inputUser === catalog.username &&
      inputPass === catalog.password
    ) {
      localStorage.setItem(`catalog-auth-${id}`, "ok");
      setIsAuthed(true);
      setLoginError("");
    } else {
      setLoginError("ユーザー名またはパスワードが正しくありません");
    }
  };

  if (error) return <div>エラーが発生しました</div>;
  if (!data) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <Spinner accessibilityLabel="読み込み中" size="large" />
      </div>
    );
  }

  const catalog = data.catalog;

  if (!catalog) {
    return (
      <div style={{ padding: "40px" }}>
        <Banner tone="critical" title="カタログが見つかりませんでした" />
      </div>
    );
  }

  // 有効期限チェック
  if (catalog.expiresAt) {
    const exp = new Date(catalog.expiresAt);
    const now = new Date();
    if (exp.getTime() < now.getTime()) {
      return (
        <div style={{ padding: "40px" }}>
          <Banner tone="critical" title="このカタログの有効期限は終了しました" />
        </div>
      );
    }
  }

  // 認証必要で未ログイン
  if (authChecked && !isAuthed) {
    return (
      <div style={{ maxWidth: "400px", margin: "60px auto" }}>
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              ログイン認証
            </Text>
            <TextField
              label="ユーザー名"
              value={inputUser}
              onChange={setInputUser}
              autoComplete="off"
            />
            <TextField
              label="パスワード"
              type="password"
              value={inputPass}
              onChange={setInputPass}
              autoComplete="off"
            />
            {loginError && (
              <Banner tone="critical">{loginError}</Banner>
            )}
            <Button onClick={handleLogin} variant="primary">
              ログイン
            </Button>
          </BlockStack>
        </Card>
      </div>
    );
  }

  // 認証済み or 認証不要 → プレビュー表示
  return (
    <PreviewCatalog
      title={catalog.title}
      leadText={catalog.leadText}
      products={catalog.products as Product[]}
      columnCount={catalog.columnCount || 3}
      editable={false}
    />
  );
}
