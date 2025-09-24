// src/app/admin/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Provider } from "@shopify/app-bridge-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "ダッシュボード", href: "/admin" },
    { name: "商品一覧", href: "/admin/products" },
    { name: "顧客一覧", href: "/admin/customers" },
    { name: "カタログ一覧", href: "/admin/catalogs" },
  ];

  // ✅ host パラメータ取得
  const host =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("host") || ""
      : "";

  const config = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
    host,
    forceRedirect: true,
  };

  return (
    <Provider config={config}>
      <div className="flex min-h-screen bg-white font-sans">
        {/* サイドメニュー */}
        <aside className="w-64 border-r border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold tracking-wide mb-10">カタログアプリ</h2>
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg transition ${
                  pathname === item.href
                    ? "bg-black text-white font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* メイン */}
        <main className="flex-1 p-10 bg-gray-50">
          <div className="max-w-6xl mx-auto bg-white shadow-md rounded-xl p-8">
            {children}
          </div>
        </main>
      </div>
    </Provider>
  );
}
