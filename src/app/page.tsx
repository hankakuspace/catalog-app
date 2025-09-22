// src/app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  // ✅ TOPにアクセスしたら管理画面へリダイレクト
  redirect("/admin");
}
