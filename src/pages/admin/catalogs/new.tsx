// src/pages/admin/catalogs/new.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// ⭐ Product 型（PreviewCatalog と完全一致させる）
export interface CatalogProduct {
  id: string;
  title: string;
  price?: string;
  customPrice?: string;
  imageUrl?: string;
  imageUrls?: string[];
  artist?: string;
  year?: string;
  dimensions?: string;
  medium?: string;
  frame?: string;
  material?: string;
  size?: string;
  technique?: string;
  certificate?: string;
  onlineStoreUrl?: string; // ⭐ null 禁止（undefined OK）
  availabilityStatus?: string;
  editionTotal?: string;
}

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

function formatDateInput(date: Date | null): string {
  if (!date) return "";
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}/${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateInput(value: string): Date | null {
  const normalized = value.trim().replace(/-/g, "/");
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);

  if (!match) return null;

  const parsedYear = Number(match[1]);
  const parsedMonth = Number(match[2]);
  const parsedDay = Number(match[3]);

  if (
    Number.isNaN(parsedYear) ||
    Number.isNaN(parsedMonth) ||
    Number.isNaN(parsedDay) ||
    parsedMonth < 1 ||
    parsedMonth > 12 ||
    parsedDay < 1 ||
    parsedDay > 31
  ) {
    return null;
  }

  const parsedDate = new Date(parsedYear, parsedMonth - 1, parsedDay);
  parsedDate.setHours(0, 0, 0, 0);

  if (
    parsedDate.getFullYear() !== parsedYear ||
    parsedDate.getMonth() !== parsedMonth - 1 ||
    parsedDate.getDate() !== parsedDay
  ) {
    return null;
  }

  return parsedDate;
}

export default function NewCatalogPage() {
  const router = useRouter();
  const { id, shop: shopQuery } = router.query;

  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [leadText, setLeadText] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [allSearchProducts, setAllSearchProducts] = useState<CatalogProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>(
    [],
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");
  const [toastColor, setToastColor] = useState<"success" | "error">("success");
  const toggleToastActive = useCallback(() => setToastActive((a) => !a), []);

  const searchAbortRef = useRef<AbortController | null>(null);
  const latestSearchIdRef = useRef(0);
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const getShopDomain = useCallback(() => {
    const queryShop = Array.isArray(shopQuery)
      ? shopQuery[0]
      : typeof shopQuery === "string"
      ? shopQuery
      : "";

    const storedShop =
      typeof window !== "undefined"
        ? localStorage.getItem("shopify_shop") || ""
        : "";

    const shop = queryShop || storedShop || "and-collection-a.myshopify.com";

    if (typeof window !== "undefined" && shop) {
      localStorage.setItem("shopify_shop", shop);
    }

    return shop;
  }, [shopQuery]);

  const normalizeSearchText = useCallback((value: string) => {
    return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  }, []);

  const isNumericSearchQuery = useCallback((value: string) => {
    return /^\d+$/.test(value.trim());
  }, []);

  const yearMatchesSearchQuery = useCallback((raw: string, yearValue?: string) => {
    const q = raw.trim();
    if (!isNumericSearchQuery(q)) return true;
    if (!yearValue) return false;

    const yearNumber = Number(yearValue);
    if (Number.isNaN(yearNumber)) return false;

    if (q.length === 1) {
      const start = Number(q) * 1000;
      return yearNumber >= start && yearNumber <= start + 999;
    }
    if (q.length === 2) {
      const start = Number(q) * 100;
      return yearNumber >= start && yearNumber <= start + 99;
    }
    if (q.length === 3) {
      const start = Number(q) * 10;
      return yearNumber >= start && yearNumber <= start + 9;
    }
    if (q.length === 4) {
      return yearNumber === Number(q);
    }

    return false;
  }, [isNumericSearchQuery]);

  const getSearchRank = useCallback((raw: string, product: CatalogProduct) => {
    const q = normalizeSearchText(raw);
    if (!q) return 0;

    const title = normalizeSearchText(product.title || "");
    const artist = normalizeSearchText(product.artist || "");

    if (title.startsWith(q)) return 1;
    if (artist.startsWith(q)) return 2;
    if (title.includes(q)) return 3;
    if (artist.includes(q)) return 4;

    return 99;
  }, [normalizeSearchText]);

  const filterCatalogProducts = useCallback((products: CatalogProduct[], raw: string) => {
    const query = normalizeSearchText(raw);
    if (!query) return [];

    return products
      .filter((product) => {
        const title = normalizeSearchText(product.title || "");
        const artist = normalizeSearchText(product.artist || "");

        if (isNumericSearchQuery(raw)) {
          return (
            yearMatchesSearchQuery(raw, product.year) ||
            title.includes(query) ||
            artist.includes(query)
          );
        }

        return (
          title.startsWith(query) ||
          artist.startsWith(query) ||
          title.includes(query) ||
          artist.includes(query)
        );
      })
      .sort((a, b) => {
        const rankDiff = getSearchRank(raw, a) - getSearchRank(raw, b);
        if (rankDiff !== 0) return rankDiff;

        return (a.title || "").localeCompare(b.title || "", "ja");
      });
  }, [
    getSearchRank,
    isNumericSearchQuery,
    normalizeSearchText,
    yearMatchesSearchQuery,
  ]);

  const fetchAllSearchProducts = useCallback(async () => {
    if (allSearchProducts.length > 0) {
      return allSearchProducts;
    }

    const shop = getShopDomain();
    const params = new URLSearchParams({ shop, query: "" });

    const res = await fetch(`/api/products?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "商品データ取得に失敗しました");
    }

    const fixed = (data.products || []).map((p: CatalogProduct) => ({
      ...p,
      onlineStoreUrl: p.onlineStoreUrl ?? undefined,
    }));

    setAllSearchProducts(fixed);
    return fixed;
  }, [allSearchProducts, getShopDomain]);

  useEffect(() => {
    if (toastActive) {
      const interval = setInterval(() => {
        const toastEl = document.querySelector(
          ".Polaris-Frame-Toast",
        ) as HTMLElement | null;
        if (toastEl) {
          toastEl.style.backgroundColor =
            toastColor === "success" ? "#36B37E" : "#DE3618";
          toastEl.style.color = "#fff";
          toastEl.style.fontWeight = "500";
          const closeBtn = toastEl.querySelector(
            ".Polaris-Frame-Toast__CloseButton",
          ) as HTMLElement | null;
          if (closeBtn) closeBtn.style.color = "#fff";
          clearInterval(interval);
        }
      }, 50);
      setTimeout(() => clearTimeout(interval), 1000);
    }
  }, [toastActive, toastColor]);

  useEffect(() => {
    const shop = getShopDomain();
    const params = new URLSearchParams({ warm: "1" });

    if (shop) {
      params.set("shop", shop);
    }

    fetchAllSearchProducts().catch((err) => {
      console.error("商品検索用データの事前取得に失敗しました:", err);
    });

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    };
  }, [fetchAllSearchProducts]);

  const toastMarkup = toastActive ? (
    <Toast
      content={toastContent}
      onDismiss={toggleToastActive}
      duration={3000}
    />
  ) : null;

  const [columnCount, setColumnCount] = useState(3);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [expiresDate, setExpiresDate] = useState<Date | null>(null);
  const [expiresDateInput, setExpiresDateInput] = useState("");

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

  const handleExpiresDateInputChange = useCallback((value: string) => {
    setExpiresDateInput(value);

    if (value.trim() === "") {
      setExpiresDate(null);
      return;
    }

    const parsedDate = parseDateInput(value);
    if (!parsedDate) {
      return;
    }

    setExpiresDate(parsedDate);
    setDate({
      month: parsedDate.getMonth(),
      year: parsedDate.getFullYear(),
    });
  }, []);

  const handleExpiresDateSelect = useCallback(({ start }: { start: Date }) => {
    const selectedDate = new Date(start);
    selectedDate.setHours(0, 0, 0, 0);

    setExpiresDate(selectedDate);
    setExpiresDateInput(formatDateInput(selectedDate));
    setDate({
      month: selectedDate.getMonth(),
      year: selectedDate.getFullYear(),
    });
    setDatePickerActive(false);
  }, []);

  const handleMonthChange = useCallback(
    (nextMonth: number, nextYear: number) => {
      setDate({ month: nextMonth, year: nextYear });
    },
    [],
  );

  // ⭐ 編集時ロード
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
            const loadedDate = new Date(data.catalog.expiresAt);
            loadedDate.setHours(0, 0, 0, 0);
            setExpiresDate(loadedDate);
            setExpiresDateInput(formatDateInput(loadedDate));
            setDate({
              month: loadedDate.getMonth(),
              year: loadedDate.getFullYear(),
            });
          } else {
            setExpiresDate(null);
            setExpiresDateInput("");
          }
        }
      } catch (err) {
        console.error("カタログ取得エラー:", err);
      }
    };

    fetchCatalog();
  }, [id]);

  // ⭐ 保存処理
  const handleSave = async () => {
    const shop = getShopDomain();

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

  // ✅ ★追加：並び替え・削除の変更を即保存（以前できてた挙動の復活）
  const handleReorder = (products: CatalogProduct[]) => {
    setSelectedProducts(products);

    if (!id) return;

    const shop = getShopDomain();

    fetch("/api/catalogs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title,
        label,
        leadText,
        products,
        columnCount,
        username,
        password,
        expiresAt: expiresDate ? expiresDate.toISOString() : null,
        shop,
      }),
    }).catch((err) => {
      console.error("並び替え保存失敗:", err);
    });
  };

  const handleSyncProducts = async () => {
    const shop = getShopDomain();

    if (!shop) {
      setToastContent("Shopifyストア情報が見つかりません");
      setToastColor("error");
      setToastActive(true);
      return;
    }

    setSyncingProducts(true);

    try {
      const res = await fetch(`/api/products/sync?shop=${encodeURIComponent(shop)}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "商品データ同期に失敗しました");
      }

      setToastContent(`商品データを同期しました（${data.count || 0}件）`);
      setToastColor("success");
      setToastActive(true);

      const params = new URLSearchParams({ warm: "1", shop });
      fetch(`/api/products?${params.toString()}`).catch((err) => {
        console.error("商品検索キャッシュの再生成に失敗しました:", err);
      });
    } catch (err) {
      console.error(err);
      setToastContent("商品データ同期に失敗しました");
      setToastColor("error");
      setToastActive(true);
    } finally {
      setSyncingProducts(false);
    }
  };

  // ⭐ 商品検索（onlineStoreUrl を保持）
  const handleSearch = async (query: string) => {
    const trimmedQuery = query.trim();

    if (trimmedQuery === "") {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
        searchDebounceTimerRef.current = null;
      }
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      latestSearchIdRef.current += 1;
      setSearchResults([]);
      setLoading(false);
      return;
    }

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    setLoading(true);

    searchDebounceTimerRef.current = setTimeout(async () => {
      const currentSearchId = latestSearchIdRef.current + 1;
      latestSearchIdRef.current = currentSearchId;

      try {
        if (allSearchProducts.length > 0) {
          if (currentSearchId !== latestSearchIdRef.current) {
            return;
          }

          setSearchResults(filterCatalogProducts(allSearchProducts, trimmedQuery));
          return;
        }

        const products = await fetchAllSearchProducts();

        if (currentSearchId !== latestSearchIdRef.current) {
          return;
        }

        const localResults = filterCatalogProducts(products, trimmedQuery);

        if (localResults.length > 0) {
          setSearchResults(localResults);
          return;
        }

        if (searchAbortRef.current) {
          searchAbortRef.current.abort();
        }

        const controller = new AbortController();
        searchAbortRef.current = controller;

        const shop = getShopDomain();
        const params = new URLSearchParams({ shop, query: trimmedQuery });
        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "商品検索に失敗しました");
        }

        if (currentSearchId !== latestSearchIdRef.current) {
          return;
        }

        const fixed = (data.products || []).map((p: CatalogProduct) => ({
          ...p,
          onlineStoreUrl: p.onlineStoreUrl ?? undefined,
        }));

        setSearchResults(fixed);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("商品検索エラー:", err);

        if (currentSearchId === latestSearchIdRef.current) {
          setSearchResults([]);
        }
      } finally {
        if (currentSearchId === latestSearchIdRef.current) {
          setLoading(false);
        }
      }
    }, 150);
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
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Button onClick={handleSyncProducts} loading={syncingProducts}>
              商品データ同期
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {id ? "Update Record" : "New Record"}
            </Button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: "20px",
          }}
        >
          {/* ▼ 左：プレビュー */}
          <div>
            <PreviewCatalog
              title={title}
              leadText={leadText}
              products={selectedProducts}
              editable
              onReorder={handleReorder}
              onRemove={(removeId) =>
                handleReorder(selectedProducts.filter((p) => p.id !== removeId))
              }
              columnCount={columnCount}
            />
          </div>

          {/* ▼ 右：フォーム */}
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
                onChange={(val) => setColumnCount(Number(val))}
              />

              <TextField
                label="検索キーワード"
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  handleSearch(value);
                }}
                autoComplete="off"
                placeholder="作家名・作品タイトル"
              />

              {loading ? (
                <Spinner accessibilityLabel="検索中" size="large" />
              ) : searchQuery.trim() !== "" && searchResults.length === 0 ? (
                <div style={{ padding: "12px 0" }}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    検索結果がありませんでした
                  </Text>
                </div>
              ) : (
                <ResourceList
                  resourceName={{ singular: "product", plural: "products" }}
                  items={searchResults}
                  renderItem={(item) => (
                    <ResourceItem
                      id={item.id}
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
                      <div style={{ lineHeight: "1.4" }}>
                        <Text as="div" variant="bodySm" fontWeight="medium">
                          {`${item.title}${
                            item.year ? ` ,${item.year}` : ""
                          }${item.size ? ` ${item.size}` : ""}`}
                        </Text>
                        <Text as="div" variant="bodySm" tone="subdued">
                          {item.artist}
                        </Text>
                      </div>
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
                    value={expiresDateInput}
                    prefix={<Icon source={CalendarIcon} />}
                    autoComplete="off"
                    placeholder="yyyy/mm/dd"
                    onFocus={() => setDatePickerActive(true)}
                    onChange={handleExpiresDateInputChange}
                  />
                }
                onClose={() => setDatePickerActive(false)}
              >
                <div style={{ padding: "12px 16px 0 16px" }}>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {`${year}年 ${MONTH_LABELS[month]}`}
                  </Text>
                </div>

                <DatePicker
                  month={month}
                  year={year}
                  selected={expiresDate || new Date()}
                  onMonthChange={handleMonthChange}
                  onChange={handleExpiresDateSelect}
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
