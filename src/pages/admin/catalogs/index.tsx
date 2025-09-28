// src/pages/admin/catalogs/index.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Page,
  ResourceList,
  ResourceItem,
  Text,
  Link,
  Spinner,
} from "@shopify/polaris";
import { db } from "@/lib/firebase";
import { collection, getDocs, Timestamp } from "firebase/firestore";

interface Catalog {
  id: string;
  title: string;
  createdAt?: Timestamp;
  previewUrl?: string;
}

export default function CatalogList() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const snapshot = await getDocs(collection(db, "shopify_catalogs_app"));
        const data: Catalog[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Catalog[];
        setCatalogs(data);
      } catch (err) {
        console.error("❌ Error fetching catalogs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogs();
  }, []);

  return (
    <Page title="保存済みカタログ一覧">
      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Spinner accessibilityLabel="Loading" size="large" />
          </div>
        ) : (
          <ResourceList
            resourceName={{ singular: "catalog", plural: "catalogs" }}
            items={catalogs}
            renderItem={(item) => {
              const { id, title, createdAt, previewUrl } = item;

              return (
                <ResourceItem
                  id={id}
                  accessibilityLabel={`View details for ${title}`}
                  onClick={() => {}} // 必須プロパティ（今回は何もしない）
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 2fr 1fr",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    {/* タイトル */}
                    <Text variant="bodyMd" fontWeight="bold">
                      {title}
                    </Text>

                    {/* 作成日 */}
                    <Text variant="bodyMd">
                      {createdAt
                        ? createdAt.toDate().toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </Text>

                    {/* プレビューURL */}
                    <Text variant="bodyMd">{previewUrl ? previewUrl : "-"}</Text>

                    {/* View リンク */}
                    {previewUrl ? (
                      <Link url={previewUrl} external>
                        View
                      </Link>
                    ) : (
                      "-"}
                  </div>
                </ResourceItem>
              );
            }}
          />
        )}
      </Card>
    </Page>
  );
}
