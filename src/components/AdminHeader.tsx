// src/components/AdminHeader.tsx
import Link from "next/link";
import { useRouter } from "next/router";

export default function AdminHeader() {
  const router = useRouter();

  const isActive = (path: string) =>
    router.pathname === path
      ? "font-semibold text-blue-600 border-b-2 border-blue-600 pb-1"
      : "text-gray-600 hover:text-blue-600";

  return (
    <div className="mb-4 border-b border-gray-200 pb-2">
      <div className="flex gap-6 text-sm">
        <Link href="/admin/catalogs" className={isActive("/admin/catalogs")}>
          Catalog List
        </Link>
        <Link href="/admin/catalogs/new" className={isActive("/admin/catalogs/new")}>
          New Record
        </Link>
      </div>
    </div>
  );
}
