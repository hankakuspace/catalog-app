// src/pages/admin/catalogs/new.tsx
"use client";

// export const config = { runtime: "experimental-edge" };

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
  DatePicker,
  Popover,
  Icon,
  Toast,
} from "@shopify/polaris";
import { CalendarIcon, ViewIcon, HideIcon } from "@shopify/polaris-icons";
import AdminHeader from "@/components/AdminHeader";
import PreviewCatalog from "@/components/PreviewCatalog";

/** ⭐ Product 型を PreviewCatalog と完全一致にする */
export interface CatalogProduct {
  id: string;
  title: string;
  price?: string;
  customPrice?: string;
  imageUrl?: string;
  artist?: string;
  year?: string;
  dimensions?: string;
  medium?: string;
  frame?: string;
  material?: string;
  size?: string;
  technique?: string;
  certificate?: string;
  onlineStoreUrl?: string; /** ← null を許可しない（重要） */
}

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function NewCatalogPage() {
  const router = useRouter();
  const { id } = router.query;

  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [leadText, setLeadText] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  /** ⭐ 型統一 */
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Toast
  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");
  const [toastColor, setToastColor] =
    useState<"success" | "error">("success");
  const toggleToastActive = useCallback(
    () => setToastActive((a) => !a),
    []
  );

  useEffect(() => {
    if (toastActive) {
      const interval = setInterval(() => {
        const toastEl =
          document.querySelector(".Polaris-Frame-Toast") as
            | HTMLElement
            | null;
        if (toastEl) {
          toastEl.style.backgroundColor =
            toastColor === "success" ? "#36B37E" : "#DE3618";
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

  const today = new Date();
  const [{ month, year }, setDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  const [datePickerActive, setDatePickerActive] = useState(false);

  const quillModules = {
    toolbar: [
      ["clean"],
      [{ font: [] }, { size: [] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
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
  ];

  /** ⭐ カタログ編集ロード */
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

          // ⭐ null を undefined に補正
          const fixedProducts: CatalogProduct[] = (
            data.catalog.products || []
          ).map((p: CatalogProduct) => ({
            ...p,
            onlineStoreUrl: p.onlineStoreUrl ?? undefined,
          }));

          setSelectedProducts(fixedProducts);
          setColumnCount(data.catalog.columnCount || 3);
          setUsername(data.catalog.username || "");
          setPassword(data.catalog.password || "");

          if (data.catalog.expiresAt) {
            const d = new Date(data.catalog.expiresAt);
            d.setHours(0, 0, 0, 0);
            setExpiresDate(d);
            setDate({
              month: d.getMonth(),
              year: d.getFullYear(),
            });
          }
        }
      } catch (err) {
        console.error("カタログ取得エラー:", err);
      }
    };

    fetchCatalog();
  }, [id]);

  /** ⭐ 保存処理 */
  const handleSave = async () => {
    const shop = localStorage.getItem("shopify_shop") || "";

    if (!title.trim() || selectedProducts.length === 0) {
      setToastContent("タイトルと商品は必須です");
      setToastColor("error");
      setToastActive(true);
      return;
    }
    if (username && !password) {
      setToastContent("ユーザー名を入力した場合はパスワードも必須です");
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
        shop,
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

  /** ⭐ 商品検索（onlineStoreUrl を undefined で保持する） */
  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const shop = localStorage.getItem("shopify_shop") || "";
      const params = new URLSearchParams({ shop, query });

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      const fixed = (data.products || []).map((p: CatalogProduct) => ({
        ...p,
        onlineStoreUrl: p.onlineStoreUrl ?? undefined,
      }));

      setSearchResults(fixed);
    } catch (err) {
      console.error("商品検索エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Frame>
      <div style={{ width: "100%", padding: "20px", backgroundColor: "#fff" }}>
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
          {/* -------- 左：Preview -------- */}
          <div>
            <PreviewCatalog
              title={title}
              leadText={leadText}
              products={selectedProducts}
              editable
              onReorder={setSelectedProducts}
              onRemove={(id) =>
                setSelectedProducts(
                  selectedProducts.filter((p) => p.id !== id)
                )
              }
              columnCount={columnCount}
            />
          </div>

          {/* -------- 右：フォーム -------- */}
          <Card>
            <BlockStack gap="400">
              <TextField label="タイトル" value={title} onChange={setTitle} />

              <TextField
                label="ラベル"
                value={label}
                onChange={setLabel}
                autoComplete="off"
                placeholder="任意のラベル"
              />

              <Select
                label="列数"
                options={[
                  { label: "2列", value: "2" },
                  { label: "3列", value: "3" },
                  { label: "4列", value: "4" },
                ]}
                value={String(columnCount)}
                onChange={(v) => setColumnCount(Number(v))}
              />

              <TextField
                label="検索キーワード"
                value={searchQuery}
                onChange={(v) => {
                  setSearchQuery(v);
                  if (v.trim()) handleSearch(v);
                  else setSearchResults([]);
                }}
                autoComplete="off"
                placeholder="作家名・作品タイトル"
              />

              {loading ? (
                <Spinner accessibilityLabel="検索中" size="large" />
              ) : (
                <ResourceList
                  resourceName={{
                    singular: "product",
                    plural: "products",
                  }}
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

              <ReactQuill
                theme="snow"
                value={leadText}
                onChange={setLeadText}
                modules={quillModules}
                formats={quillFormats}
              />

              <TextField
                label="ユーザー名"
                value={username}
                onChange={setUsername}
                autoComplete="off"
              />

              <TextField
                label="パスワード"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                autoComplete="off"
                placeholder="パスワード"
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Icon source={showPassword ? HideIcon : ViewIcon} />
                  </button>
                }
              />

              <Popover
                active={datePickerActive}
                activator={
                  <TextField
                    label="有効期限"
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
                    onFocus={() => setDatePickerActive(true)}
                    placeholder="yyyy/mm/dd"
                    onChange={() => {}}
                  />
                }
                onClose={() => setDatePickerActive(false)}
              >
                <DatePicker
                  month={month}
                  year={year}
                  selected={expiresDate || new Date()}
                  onChange={({ start }) => {
                    const d = new Date(start);
                    d.setHours(0, 0, 0, 0);
                    setExpiresDate(d);
                    setDate({
                      month: d.getMonth(),
                      year: d.getFullYear(),
                    });
                    setDatePickerActive(false);
                  }}
                />
              </Popover>
            </BlockStack>
          </Card>
        </div>
      </div>

      {toastMarkup}
    </Frame>
  );
}
