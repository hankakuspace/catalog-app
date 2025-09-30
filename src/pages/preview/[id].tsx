// src/pages/preview/[id].tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import PreviewCatalog, { Product } from "@/components/PreviewCatalog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CatalogPreviewPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data, error } = useSWR(
    id ? `/api/catalogs?id=${id}` : null,
    fetcher
  );

  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [inputUser, setInputUser] = useState("");
  const [inputPass, setInputPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // 認証状態チェック
  useEffect(() => {
    if (!data?.catalog || !id) return;
    const catalog = data.catalog;
    if (catalog.username && catalog.password) {
      const saved = localStorage.getItem(`catalog-auth-${id}`);
      if (saved === "ok") {
        setIsAuthed(true);
      }
    } else {
      setIsAuthed(true); // 認証不要
    }
    setAuthChecked(true);
  }, [data, id]);

  const handleLogin = () => {
    const catalog = data?.catalog;
    if (!catalog) return;
    if (inputUser === catalog.username && inputPass === catalog.password) {
      localStorage.setItem(`catalog-auth-${id}`, "ok");
      setIsAuthed(true);
      setLoginError("");
    } else {
      setLoginError("ユーザー名またはパスワードが正しくありません");
    }
  };

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

  // 有効期限チェック
  if (catalog.expiresAt) {
    const exp = new Date(catalog.expiresAt);
    const now = new Date();
    if (exp.getTime() < now.getTime()) {
      return (
        <div className="p-6 bg-red-100 text-red-700 rounded">
          このカタログの有効期限は終了しました
        </div>
      );
    }
  }

  // 認証必要で未ログイン
  if (authChecked && !isAuthed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-sm">
          <h2 className="text-lg font-bold mb-4">ログイン認証</h2>
          <input
            type="text"
            placeholder="ユーザー名"
            value={inputUser}
            onChange={(e) => setInputUser(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="パスワード"
            value={inputPass}
            onChange={(e) => setInputPass(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loginError && (
            <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded mb-3">
              {loginError}
            </div>
          )}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  // 認証済み or 認証不要 → プレビュー表示
  return (
    <div className="p-4">
      <PreviewCatalog
        title={catalog.title}
        leadText={catalog.leadText}
        products={catalog.products as Product[]}
        columnCount={catalog.columnCount || 3}
        editable={false}
      />
    </div>
  );
}
