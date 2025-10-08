// src/pages/admin/catalogs/new.tsx
"use client";

export const config = { runtime: "experimental-edge" };

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import {
  Frame,
  BlockStack,
  Text,
  TextField,
  Card,
  ResourceList,
  ResourceItem,
  Spinner,
  Thumbnail,
  Button,
  Select,
  Toast,
} from "@shopify/polaris";
import AdminHeader from "@/components/AdminHeader";
import PreviewCatalog, { Product } from "@/components/PreviewCatalog";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function NewCatalogPage() {
  const router = useRouter();
  const { id } = router.query;

  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [leadText, setLeadText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ Toast管理
  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");
  const [toastColor, setToastColor] = useState<"success" | "error">("success");

  const toggleToastActive = useCallback(() => setToastActive((a) => !a), []);

  // ✅ Toast背景色を指定色で強制
  useEffect(() => {
    if (toastActive) {
      const interval = setInterval(() => {
        const toastEl = document.querySelector(
          ".Polaris-Frame-Toast"
        ) as HTMLElement | null;
        if (toastEl) {
          toastEl.style.backgroundColor =
            toastColor === "success" ? "#36B37E" : "#DE3618"; // ✅ 緑／赤で強制
          toastEl.style.color = "#fff";
          toastEl.style.fontWeight = "500";

          const closeBtn = toastEl.querySelector(
            ".Polaris-Frame-Toast__CloseButton"
          ) as HTMLElement | null;
          if (closeBtn) closeBtn.style.color = "#fff";

          clearInterval(interval);
        }
      }, 50);
      setTimeout(() => clearInterval(interval), 1000);
    }
  }, [toastActive, toastColor]);

  const toastMarkup = toastActive ? (
    <Toast content={toastContent} onDismiss={toggleToastActive} duration={3000} />
  ) : null;

  const [columnCount, setColumnCount] = useState(3);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [expiresDate, setExpiresDate] = useState<Date | null>(null);

// ✅ Quill設定（不要アイコン削除＋2行構成＋cleanを上段へ）
const quillModules = {
  toolbar: [
    // ---- 1行目：フォント・サイズ・リセット ----
    ["clean"],               // ← リセットを上段先頭に
    [{ font: [] }, { size: [] }],

    // ---- 2行目：テキスト操作系（箇条書き削除済） ----
    ["bold", "italic", "underline", "strike"], // 強調
    [{ color: [] }, { background: [] }],       // 文字色・背景色
    [{ align: [] }],                           // 位置揃え
  ],
};

  const quillFormats = [
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "list",
  ];

  // ✅ カタログ取得
  useEffect(() => {
    if (!id) return;
    const fetchCatalog = async () => {
      try {
        const res = await fetch(`/api/catalogs?id=${id}`);
        const data = await res.json();
        if (res.ok && data.catalog) {
          setTitle(data.catalog.title || "");
          setLabel(data.catalog.label || "");
          setLeadText(data.catalog.leadText || "");
          setSelectedProducts(data.catalog.products || []);
          setColumnCount(data.catalog.columnCount || 3);
          setUsername(data.catalog.username || "");
          setPassword(data.catalog.password || "");
          if (data.catalog.expiresAt) {
            const d = new Date(data.catalog.expiresAt);
            d.setHours(0, 0, 0, 0);
            setExpiresDate(d);
          }
        }
      } catch (err) {
        console.error("カタログ取得エラー:", err);
      }
    };
    fetchCatalog();
  }, [id]);

  // ✅ 保存処理
  const handleSave = async () => {
    if (!title.trim() || selectedProducts.length === 0) {
      setToastContent("タイトルと商品は必須です");
      setToastColor("error");
      setToastActive(true);
      return;
    }

    setSaving(true);
    try {
      const body = {
        id,
        title,
        label,
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

      setToastContent("保存しました");
      setToastColor("success");
      setToastActive(true);
    } catch (err) {
      console.error(err);
      setToastContent("保存に失敗しました");
      setToastColor("error");
      setToastActive(true);
    } finally {
      setSaving(false);
    }
  };

  // ✅ 商品検索
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

  return (
    <Frame>
      <div style={{ width: "100%", padding: "20px" }}>
    <div style={{ marginBottom: "40px" }}>
  <Text as="h1" variant="headingLg" fontWeight="regular">
    Catalog Edit
  </Text>
</div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <AdminHeader />
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {id ? "Update Record" : "New Record"}
          </Button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: "20px",
          }}
        >
          {/* 左：プレビュー */}
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

          {/* 右：フォーム */}
          <Card>
            <BlockStack gap="400">
              <TextField
                label="タイトル"
                value={title}
                onChange={setTitle}
                autoComplete="off"
              />
              <TextField
                label="ラベル"
                value={label}
                onChange={setLabel}
                autoComplete="off"
                placeholder="任意のラベルを入力"
              />

              {/* 列数 */}
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

              {/* 検索 */}
              <BlockStack gap="200">
                <TextField
                  label="検索キーワード"
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
                      {item.artist ? `${item.artist}, ` : ""}
                      {item.title}
                    </ResourceItem>
                  )}
                />
              )}

              {/* ✅ リード文 */}
              <ReactQuill
                theme="snow"
                value={leadText}
                onChange={setLeadText}
                modules={quillModules}
                formats={quillFormats}
              />
            </BlockStack>
          </Card>
        </div>
      </div>

      {/* ✅ トースト */}
      {toastMarkup}
    </Frame>
  );
}
