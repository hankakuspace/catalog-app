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
import { collection, getDocs } from "firebase/firestore";

interface Catalog {
  id: string;
  title: string;
  createdAt?: any;
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
                <ResourceItem id={id}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 2fr 1fr",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    <Text variant="bodyMd" fontWeight="bold">
                      {title}
                    </Text>
                    <Text variant="bodyMd">
                      {createdAt
                        ? createdAt.toDate().toLocaleString("ja-JP")
                        : "-"}
                    </Text>
                    <Text variant="bodyMd">
                      {previewUrl ? previewUrl : "-"}
                    </Text>
                    {previewUrl ? (
                      <Link url={previewUrl} external>
                        View
                      </Link>
                    ) : (
                      "-"
                    )}
                  </div>
                </ResourceItem>
              ); // ✅ return の閉じ（必須）
            }}
          />
        )}
      </Card>
    </Page>
  );
}
