// src/app/admin/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "ダッシュボード", href: "/admin" },
    { name: "商品一覧", href: "/admin/products" },
    { name: "顧客一覧", href: "/admin/customers" },
    { name: "カタログ一覧", href: "/admin/catalogs" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* ✅ サイドメニュー */}
      <aside className="w-60 bg-gray-100 border-r p-4">
        <h2 className="text-lg font-bold mb-6">カタログアプリ</h2>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded ${
                pathname === item.href ? "bg-blue-500 text-white" : "hover:bg-gray-200"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ✅ メインコンテンツ */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
