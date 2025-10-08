// src/pages/admin/catalogs/new.tsx
"use client";

export const config = {
  runtime: "experimental-edge",
};

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
import AdminHeader from "@/components/AdminHeader";
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [expiresDate, setExpiresDate] = useState<Date | null>(null);
  const today = new Date();
  const [{ month, year }, setDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  const [datePickerActive, setDatePickerActive] = useState(false);

  useEffect(() => {
    if (!id) return;
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
  }, [id]);

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
        expiresAt: expiresDate ? expiresDate.toISOString() : null,
        shop: "catalog-app-dev-2.myshopify.com",
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
    <div style={{ width: "100%", padding: "20px" }}>
      {/* ✅ Catalog List ページと全く同じ構成 */}
      <Text as="h1" variant="headingLg">
        Catalog Edit
      </Text>
      <div style={{ marginBottom: "20px" }}>
        <AdminHeader />
      </div>

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

      {/* メインエリア */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 1fr",
          gap: "20px",
        }}
      >
        {/* ✅ プレビュー（Cardなし） */}
        <div>
          <PreviewCatalog
            title={title}
            leadText={leadText}
            products={selectedProducts}
            editable
            onReorder={setSelectedProducts}
            onRemove={(id) =>
              setSelectedProducts(selectedProducts.filter((p) => p.id !== id))
            }
            columnCount={columnCount}
          />
        </div>

        {/* ✅ 右フォーム */}
        <Card>
          <BlockStack gap="400">
            <TextField label="タイトル" value={title} onChange={setTitle} autoComplete="off" />

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
                        <Thumbnail source={item.imageUrl} alt={item.title} size="small" />
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

            <BlockStack gap="200">
              <Text as="h2" variant="headingSm">
                リード文
              </Text>
              <ReactQuill theme="snow" value={leadText} onChange={setLeadText} />
            </BlockStack>

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
                        ).padStart(2, "0")}/${String(expiresDate.getDate()).padStart(2, "0")}`
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

            <Button variant="primary" onClick={handleSave} loading={saving}>
              {id ? "カタログ更新" : "カタログ作成"}
            </Button>
          </BlockStack>
        </Card>
      </div>
    </div>
  );
}
