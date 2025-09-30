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
} from "@shopify/polaris";
import PreviewCatalog from "@/components/PreviewCatalog";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface Product {
  id: string;
  title: string;
  artist?: string;
  imageUrl?: string;
  price?: string;
  year?: string;
  dimensions?: string;
  medium?: string;
  frame?: string;
}

export default function NewCatalogPage() {
  const router = useRouter();
  const { id } = router.query;

  const [title, setTitle] = useState("");
  const [leadText, setLeadText] = useState(""); // HTML文字列
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  const handleAddProduct = (product: Product) => {
    if (!selectedProducts.find((p) => p.id === product.id)) {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || selectedProducts.length === 0) {
      setSaveError("タイトルと商品は必須です");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const body = { id, title, leadText, products: selectedProducts };

      const res = await fetch("/api/catalogs", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失敗");

      setSaveSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setSaveError(`保存に失敗しました: ${err.message}`);
      } else {
        setSaveError(`保存に失敗しました: ${String(err)}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "100%", padding: "20px" }}>
      <Text as="h1" variant="headingLg">
        {id ? "カタログ編集" : "新規カタログ作成"}
      </Text>

      {saveSuccess && <Banner tone="success" title="保存完了">カタログを保存しました。</Banner>}
      {saveError && <Banner tone="critical" title="エラー">{saveError}</Banner>}

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "20px", marginTop: "20px" }}>
        {/* 左：公開プレビュー */}
        <Card>
          <PreviewCatalog title={title} leadText={leadText} products={selectedProducts} />
        </Card>

        {/* 右：フォーム */}
        <Card>
          <BlockStack gap="400">
            <TextField label="タイトル" value={title} onChange={setTitle} autoComplete="off" />

            <div>
              <Text variant="headingSm">リード文</Text>
              <ReactQuill
                theme="snow"
                value={leadText}
                onChange={setLeadText}
                modules={{
                  toolbar: [
                    [{ font: [] }, { size: [] }],
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
            </div>

            <Text variant="headingSm">作品検索</Text>
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
                    onClick={() => handleAddProduct(item)}
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
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {id ? "カタログ更新" : "カタログ作成"}
            </Button>
          </BlockStack>
        </Card>
      </div>
    </div>
  );
}
