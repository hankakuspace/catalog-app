// src/pages/index.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // ✅ アプリのTOPを /admin/catalogs にリダイレクト
    router.replace("/admin/catalogs");
  }, [router]);

  return null;
}
// trigger deploy
