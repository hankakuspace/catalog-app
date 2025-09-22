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
    <div className="
