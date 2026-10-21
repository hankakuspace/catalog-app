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

  const fetcher = async (url: string) => {
    const token = sessionStorage.getItem(`catalog-auth-${id}`);
    const res = await fetch(url, { headers: token ? { "X-Catalog-View-Token": token } : {} });
    const result = await res.json();
    if (res.status === 401) sessionStorage.removeItem(`catalog-auth-${id}`);
    if (!res.ok && ![401, 404, 410].includes(res.status)) throw new Error("Preview unavailable");
    return result;
  };

  const { data, error, mutate } = useSWR(
    hydrated && shouldFetch ? `/api/catalogs?preview=1&id=${encodeURIComponent(id as string)}` : null,
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  const [inputUser, setInputUser] = useState("");
  const [inputPass, setInputPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [expiryClock, setExpiryClock] = useState(0);
  const expiresAt = data?.catalog?.expiresAt;

  useEffect(() => {
    if (!expiresAt) return;
    const deadline = new Date(expiresAt).getTime();
    if (!Number.isFinite(deadline)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const checkExpiry = () => {
      if (timer) clearTimeout(timer);
      const now = Date.now();
      setExpiryClock(now);
      // Re-arm long deadlines without overflowing the browser's timer range.
      if (now <= deadline) timer = setTimeout(checkExpiry, Math.min(deadline - now + 1, 2147483647));
    };
    checkExpiry();
    window.addEventListener("focus", checkExpiry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", checkExpiry);
    };
  }, [expiresAt, id]);

  useEffect(() => {
    setInputUser("");
    setInputPass("");
    setLoginError("");
    setReadyToRender(false);
  }, [id]);

  useEffect(() => {
    if (!data?.catalog) { setReadyToRender(false); return; }
    const frame = requestAnimationFrame(() => setReadyToRender(true));
    return () => cancelAnimationFrame(frame);
  }, [data, id]);

  const login = async () => {
    const catalogId = id;
    if (typeof catalogId !== "string" || loggingIn) return;
    setLoggingIn(true);
    try {
      const res = await fetch(`/api/catalogs?preview=1&id=${encodeURIComponent(catalogId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inputUser, password: inputPass }),
      });
      const result = await res.json();
      if (res.status === 410) { await mutate(result, false); return; }
      if (!res.ok || !result.catalog || !result.token) {
        setLoginError("ユーザー名またはパスワードが正しくありません");
        return;
      }
      sessionStorage.setItem(`catalog-auth-${catalogId}`, result.token);
      setInputPass("");
      setLoginError("");
      await mutate(result, false);
    } catch {
      setLoginError("認証に失敗しました。もう一度お試しください");
    } finally {
      setLoggingIn(false);
    }
  };

  if (!hydrated || !shouldFetch) return <div className="p-6">読み込み中...</div>;
  if (!data) return error
    ? <div className="p-6 text-red-600">エラーが発生しました</div>
    : <div className="p-6">読み込み中...</div>;
  const catalog = data.catalog;
  const deadline = catalog?.expiresAt ? new Date(catalog.expiresAt).getTime() : null;
  if (data.expired || (deadline !== null && (!Number.isFinite(deadline) || deadline < Math.max(Date.now(), expiryClock)))) {
    return <div className="p-6 bg-red-100 text-red-700 rounded">このカタログの有効期限は終了しました</div>;
  }
  if (error) return <div className="p-6 text-red-600">エラーが発生しました</div>;

  if (data.requiresAuth) {
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
            onClick={login}
            disabled={loggingIn}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return <div className="p-6 bg-red-100 text-red-700 rounded">カタログが見つかりませんでした</div>;
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
