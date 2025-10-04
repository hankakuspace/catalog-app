// src/components/AdminHeader.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import "@fontsource/nunito-sans/400.css";

export default function AdminHeader() {
  const router = useRouter();

  const isActive = (path: string) => router.pathname === path;

  return (
    <div className="mb-10"> {/* タイトル下40pxの余白 */}
      <div
        className="flex gap-8 text-sm font-[Nunito Sans]"
        style={{ fontFamily: "'Nunito Sans', sans-serif" }}
      >
        <Link
          href="/admin/catalogs"
          className={`pb-1 border-b-2 ${
            isActive("/admin/catalogs") ? "border-black" : "border-transparent"
          }`}
        >
          Catalog List
        </Link>
        <Link
          href="/admin/catalogs/new"
          className={`pb-1 border-b-2 ${
            isActive("/admin/catalogs/new")
              ? "border-black"
              : "border-transparent"
          }`}
        >
          New Record
        </Link>
      </div>
    </div>
  );
}
