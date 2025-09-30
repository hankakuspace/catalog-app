// src/pages/admin/catalogs/new.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import {
  BlockStack,
  Text,
  TextField,
  Card,
  ResourceList,
  ResourceItem,
  Spinner,
  Thumbnail,
  Button,
  Banner,
  Select,
  DatePicker,
  Popover,
  InlineStack,
  Icon,
} from "@shopify/polaris";
import { CalendarIcon } from "@shopify/polaris-icons";
import PreviewCatalog, { Product } from "@/components/PreviewCatalog";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function NewCatalogPage() {
  const router = useRouter();
  const { id } = router.query;

  const [title, setTitle] = useState("");
  const [leadText, setLeadText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [columnCount, setColumnCount] = useState(3);

  // 認証関連フィールド
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // 有効期限（日付のみ）
  const [expiresDate, setExpiresDate] = useState<Date | null>(null);
  const today = new Date();
  const [{ month, year }, setDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  const [datePickerActive, setDatePickerActive] = useState(false);

  // 編集モードでデータ読込
  useEffect(() => {
    if (!router.isReady || !id) return;
    const fetchCatalog = async () => {
      try {
        const res = await fetch(`/api/catalogs?id=${id}`);
        const data = await res.json();
        if (res.ok && data.catalog) {
          setTitle(data.catalog.title || "");
          setLeadText(data.catalog.leadText || "");
          setSelectedProducts(data.catalog.products || []);
          setColumnCount(data.catalog.columnCount || 3);
          setUsername(data.catalog.username || "");
          setPassword(data.catalog.password || "");
          if (data.catalog.expiresAt) {
            const d = new Date(data.catalog.expiresAt);
            d.setHours(0, 0, 0, 0);
            setExpiresDate(d);
            setDate({ month: d.getMonth(), year: d.getFullYear() });
          }
        }
      } catch (err) {
        console.error("カタログ取得エラー:", err);
      }
    };
    fetchCatalog();
  }, [router.isReady, id]);

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        shop: "catalog-app-dev-2.myshopify.com",
        query,
      });
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch (err) {
      console.error("商品検索エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || selectedProducts.length === 0) {
      setSaveError("タイトルと商品は必須です");
      return;
    }
    if (username && !password) {
      setSaveError("ユーザー名を入力した場合はパスワードも必須です");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const body = {
        id,
        title,
        leadText,
        products: selectedProducts,
        columnCount,
        username,
        password,
        expiresAt: expiresDate ? expiresDate.toISOString() : null, // 00:00固定
      };

      const res = await fetch("/api/catalogs", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失敗");

      setSaveSuccess(true);
    } catch (err) {
      setSaveError(`保存に失敗しました: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
      <Text as="h1" variant="headingLg">
        {id ? "カタログ編集" : "新規カタログ作成"}
      </Text>

      {saveSuccess && (
        <Banner tone="success" title="保存完了">
          カタログを保存しました。
        </Banner>
      )}
      {saveError && (
        <Banner tone="critical" title="エラー">
          {saveError}
        </Banner>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 1fr",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {/* 左：プレビュー */}
        <Card>
          <PreviewCatalog
            title={title}
            leadText={leadText}
            products={selectedProducts}
            editable={true}
            onReorder={setSelectedProducts}
            onRemove={(id) =>
              setSelectedProducts(selectedProducts.filter((p) => p.id !== id))
            }
            columnCount={columnCount}
          />
        </Card>

        {/* 右：フォーム */}
        <Card>
          <BlockStack gap="400">
            {/* タイトル */}
            <TextField
              label="タイトル"
              value={title}
              onChange={setTitle}
              autoComplete="off"
            />

            {/* 列数選択 */}
            <Select
              label="列数"
              options={[
                { label: "2列", value: "2" },
                { label: "3列", value: "3" },
                { label: "4列", value: "4" },
              ]}
              value={String(columnCount)}
              onChange={(val) => setColumnCount(Number(val))}
            />

           {/* ログイン認証 */}
<BlockStack gap="200">
  <Text as="h2" variant="headingSm">
    ログイン認証
  </Text>
  <InlineStack gap="200" blockAlign="center">
    <div style={{ flex: 1 }}>
      <TextField
        label="ユーザー名"
        labelHidden
        placeholder="ユーザー名"
        value={username}
        onChange={setUsername}
        autoComplete="off"
      />
    </div>
    <div style={{ flex: 1 }}>
      <TextField
        label="パスワード"
        labelHidden
        placeholder="パスワード"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="off"
      />
    </div>
  </InlineStack>
</BlockStack>


            {/* 有効期限 */}
            <Popover
              active={datePickerActive}
              activator={
                <TextField
                  label="有効期限"
                  labelHidden
                  value={
                    expiresDate
                      ? `${expiresDate.getFullYear()}/${String(
                          expiresDate.getMonth() + 1
                        ).padStart(2, "0")}/${String(
                          expiresDate.getDate()
                        ).padStart(2, "0")}`
                      : ""
                  }
                  prefix={<Icon source={CalendarIcon} />}
                  placeholder="yyyy/mm/dd"
                  onFocus={() => setDatePickerActive(true)}
                  onChange={() => {}}
                  autoComplete="off"
                />
              }
              onClose={() => setDatePickerActive(false)}
            >
              <DatePicker
                month={month}
                year={year}
                onChange={({ start }) => {
                  const d = new Date(start);
                  d.setHours(0, 0, 0, 0);
                  setExpiresDate(d);
                  setDate({ month: d.getMonth(), year: d.getFullYear() });
                  setDatePickerActive(false);
                }}
                selected={expiresDate || new Date()}
              />
            </Popover>

            {/* 作品検索 */}
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm">
                作品検索
              </Text>
              <TextField
                label="検索キーワード"
                labelHidden
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  if (value.trim() !== "") handleSearch(value);
                  else setSearchResults([]);
                }}
                autoComplete="off"
                placeholder="作家名・作品タイトルで検索"
              />
            </BlockStack>
            {loading ? (
              <Spinner accessibilityLabel="検索中" size="large" />
            ) : (
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={searchResults}
                renderItem={(item) => (
                  <ResourceItem
                    id={item.id}
                    accessibilityLabel={`${item.title} を追加`}
                    onClick={() => {
                      if (!selectedProducts.find((p) => p.id === item.id)) {
                        setSelectedProducts([...selectedProducts, item]);
                      }
                    }}
                    media={
                      item.imageUrl ? (
                        <Thumbnail
                          source={item.imageUrl}
                          alt={item.title}
                          size="small"
                        />
                      ) : undefined
                    }
                  >
                    <Text as="p">
                      {item.artist ? `${item.artist}, ` : ""}
                      {item.title}
                    </Text>
                  </ResourceItem>
                )}
              />
            )}

            {/* リード文 */}
            <BlockStack gap="200">
              <Text as="h2" variant="headingSm">
                リード文
              </Text>
              <ReactQuill
                theme="snow"
                value={leadText}
                onChange={setLeadText}
                modules={{
                  toolbar: [
                    [{ font: ["sans", "serif", "monospace"] }],
                    [{ size: [] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ color: [] }, { background: [] }],
                    [{ align: [] }],
                    ["clean"],
                  ],
                }}
                formats={[
                  "font",
                  "size",
                  "bold",
                  "italic",
                  "underline",
                  "strike",
                  "color",
                  "background",
                  "align",
                ]}
              />
            </BlockStack>

            {/* 保存ボタン */}
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {id ? "カタログ更新" : "カタログ作成"}
            </Button>
          </BlockStack>
        </Card>
      </div>
    </div>
  );
}
