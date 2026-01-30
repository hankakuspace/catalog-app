// src/pages/preview/[id]/client.tsx
"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useSWR from "swr";
import Head from "next/head";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";

const PreviewCatalog = dynamic(
  () => import("@/components/PreviewCatalog"),
  { ssr: false }
);

export default function ClientPreviewPage() {
  const router = useRouter();
  const { id } = router.query;

  const [hydrated, setHydrated] = useState(false);
  const [readyToRender, setReadyToRender] = useState(false); // ⭐ 追加

  useEffect(() => {
    setHydrated(true);
  }, []);

  const shouldFetch = typeof id === "string" && id.length > 0;

  const fetcher = (url: string) =>
    fetch(url).then((res) => res.json());

  const { data, error } = useSWR(
    shouldFetch ? `/api/catalogs?id=${id}` : null,
    fetcher
  );

  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [inputUser, setInputUser] = useState("");
  const [inputPass, setInputPass] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!shouldFetch) return;
    if (!data?.catalog) return;

    const catalog = data.catalog;

    if (catalog.username && catalog.password) {
      const saved = sessionStorage.getItem(`catalog-auth-${id}`);
      if (saved === "ok") {
        setIsAuthed(true);
      }
    } else {
      setIsAuthed(true);
    }

    setAuthChecked(true);

    // ⭐ ここが肝：1フレーム遅らせて描画許可
    requestAnimationFrame(() => {
      setReadyToRender(true);
    });
  }, [hydrated, shouldFetch, data, id]);

  if (!hydrated) return <div className="p-6">読み込み中...</div>;
  if (!shouldFetch) return <div className="p-6">読み込み中...</div>;
  if (error) return <div className="p-6 text-red-600">エラーが発生しました</div>;
  if (!data) return <div className="p-6">読み込み中...</div>;

  const catalog = data.catalog;
  if (!catalog) {
    return (
      <div className="p-6 bg-red-100 text-red-700 rounded">
        カタログが見つかりませんでした
      </div>
    );
  }

  if (catalog.expiresAt) {
    const exp = new Date(catalog.expiresAt);
    if (exp.getTime() < Date.now()) {
      return (
        <div className="p-6 bg-red-100 text-red-700 rounded">
          このカタログの有効期限は終了しました
        </div>
      );
    }
  }

  if (authChecked && !isAuthed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Head>
          <title>AND COLLECTION Private View</title>
          <link rel="icon" href="/Private-View.png?v=1" />
          <link rel="apple-touch-icon" href="/Private-View.png?v=1" />
        </Head>

        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm">
          <h2 className="text-lg font-bold mb-4">ログイン認証</h2>

          <input
            value={inputUser}
            onChange={(e) => setInputUser(e.target.value)}
            className="border px-2 py-1 w-full mb-3"
            placeholder="ユーザー名"
          />

          <input
            type="password"
            value={inputPass}
            onChange={(e) => setInputPass(e.target.value)}
            className="border px-2 py-1 w-full mb-3"
            placeholder="パスワード"
          />

          {loginError && (
            <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded mb-3">
              {loginError}
            </div>
          )}

          <button
            onClick={() => {
              if (
                inputUser === catalog.username &&
                inputPass === catalog.password
              ) {
                sessionStorage.setItem(`catalog-auth-${id}`, "ok");
                setIsAuthed(true);
                setLoginError("");
              } else {
                setLoginError("ユーザー名またはパスワードが正しくありません");
              }
            }}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppProvider i18n={{}}>
      <Head>
        <title>AND COLLECTION Private View</title>
        <link rel="icon" href="/Private-View.png?v=1" />
        <link rel="apple-touch-icon" href="/Private-View.png?v=1" />
      </Head>

      <div className="p-4">
        {readyToRender && (
          <PreviewCatalog
            title={catalog.title}
            leadText={catalog.leadText}
            products={catalog.products}
            columnCount={catalog.columnCount || 3}
            editable={true}
            onReorder={() => {}}
            onRemove={() => {}}
          />
        )}
      </div>
    </AppProvider>
  );
}
