// src/pages/admin/catalogs/new.tsx
"use client";

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
  const [showPassword, setShowPassword] = useState(false);

  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");
  const [toastColor, setToastColor] = useState<"success" | "error">("success");

  const toggleToastActive = useCallback(() => setToastActive((a) => !a), []);

  useEffect(() => {
    if (toastActive) {
      const interval = setInterval(() => {
        const toastEl = document.querySelector(".Polaris-Frame-Toast") as HTMLElement | null;
        if (toastEl) {
          toastEl.style.backgroundColor = toastColor === "success" ? "#36B37E" : "#DE3618";
          toastEl.style.color = "#fff";
          toastEl.style.fontWeight = "500";
          const closeBtn = toastEl.querySelector(".Polaris-Frame-Toast__CloseButton") as HTMLElement | null;
          if (closeBtn) closeBtn.style.color = "#fff";
          clearInterval(interval);
        }
      }, 50);
      setTimeout(() => clearInterval(interval), 1000);
    }
  }, [toastActive, toastColor]);

  const toastMarkup = toastActive ? <Toast content={toastContent} onDismiss={toggleToastActive} duration={3000} /> : null;

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
    toolbar: [["clean"], [{ font: [] }, { size: [] }], ["bold", "italic", "underline", "strike"], [{ color: [] }, { background: [] }], [{ align: [] }]],
  };
  const quillFormats = ["font", "size", "bold", "italic", "underline", "strike", "color", "background", "align"];

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
            setDate({ month: d.getMonth(), year: d.getFullYear() });
          }
        }
      } catch (err) {
        console.error("カタログ取得エラー:", err);
      }
    };
    fetchCatalog();
  }, [id]);

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
        products: selectedProducts, // ⭐ onlineStoreUrl を含んだ products が保存されるようになる
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

  /**  
   * 🔥 修正ポイント  
   * ここで onlineStoreUrl を UI に反映しなければ PreviewCatalog に伝わらない。
   */
  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const shop = localStorage.getItem("shopify_shop") || "";
      const params = new URLSearchParams({ shop, query });

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      // ⭐ 必ず onlineStoreUrl を保持した Product 型に変換
      setSearchResults(
        (data.products || []).map((p: Product) => ({
          ...p,
          onlineStoreUrl: p.onlineStoreUrl ?? null, // ⭐ 追加
        }))
      );
    } catch (err) {
      console.error("商品検索エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Frame>
      {/* 中略：あなたのコードを構成変更せず全保持 */}

      {/* 重要：商品選択時の処理も onlineStoreUrl を含んだまま追加される */}
      <ResourceList
        resourceName={{ singular: "product", plural: "products" }}
        items={searchResults}
        renderItem={(item) => (
          <ResourceItem
            id={item.id}
            onClick={() => {
              if (!selectedProducts.find((p) => p.id === item.id)) {
                setSelectedProducts([...selectedProducts, item]); // ⭐ onlineStoreUrl を保持した状態で保存
              }
            }}
            media={
              item.imageUrl ? (
                <Thumbnail source={item.imageUrl} alt={item.title} size="small" />
              ) : undefined
            }
          >
            {item.artist ? `${item.artist}, ` : ""}
            {item.title}
          </ResourceItem>
        )}
      />

      {/* 中略 */}

    </Frame>
  );
}
