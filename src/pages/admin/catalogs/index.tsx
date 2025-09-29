// src/pages/admin/catalogs/index.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Page,
  Layout,
  IndexTable,
  useIndexResourceState,
  Button,
  Card,
  Text,
  BlockStack,
} from "@shopify/polaris";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Catalog {
  id: string;
  title: string;
  createdAt: string;
  previewUrl?: string;
}

export default function CatalogsIndex() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);

  const resourceName = {
    singular: "catalog",
    plural: "catalogs",
  };

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(catalogs.map((c) => ({ id: c.id })));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "shopify_catalogs_app"));
        const items: Catalog[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let createdAt = "";
          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate().toLocaleString("ja-JP");
          } else if (typeof data.createdAt === "string") {
            createdAt = new Date(data.createdAt).toLocaleString("ja-JP");
          }
          return {
            id: docSnap.id,
            title: data.title || "",
            createdAt,
            previewUrl: data.previewUrl || "",
          };
        });
        setCatalogs(items);
      } catch (err) {
        console.error("Failed to fetch catalogs:", err);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async () => {
    if (selectedResources.length === 0) return;

    try {
      for (const id of selectedResources) {
        await deleteDoc(doc(db, "shopify_catalogs_app", id));
      }
      setCatalogs((prev) =>
        prev.filter((catalog) => !selectedResources.includes(catalog.id))
      );
      clearSelection();
    } catch (err) {
      console.error("Failed to delete catalogs:", err);
    }
  };

  return (
    <Page title="保存済みカタログ一覧">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Button
              tone="critical" // ✅ destructive → tone="critical"
              onClick={handleDelete}
              disabled={!selectedResources.length}
            >
              削除
            </Button>

            <Card>
              <IndexTable
                resourceName={resourceName}
                itemCount={catalogs.length}
                selectedItemsCount={
                  allResourcesSelected ? "All" : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                selectable
                headings={[
                  { title: "タイトル" },
                  { title: "作成日" },
                  { title: "プレビューURL" },
                  { title: "操作" },
                ]}
              >
                {catalogs.map(({ id, title, createdAt, previewUrl }, index) => (
                  <IndexTable.Row
                    id={id}
                    key={id}
                    position={index}
                    selected={selectedResources.includes(id)}
                  >
                    <IndexTable.Cell>{title}</IndexTable.Cell>
                    <IndexTable.Cell>{createdAt}</IndexTable.Cell>
                    <IndexTable.Cell>
                      {previewUrl ? (
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      ) : (
                        "-"
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" tone="subdued">
                        -
                      </Text>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Card>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="primary" url="/admin/catalogs/new">
                新規カタログ作成
              </Button>
            </div>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
