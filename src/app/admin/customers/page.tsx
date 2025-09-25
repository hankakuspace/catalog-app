// src/app/admin/customers/page.tsx
"use client";

import { useEffect, useState } from "react";

interface Customer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/customers");
        if (!res.ok) throw new Error("Failed to fetch customers");
        const data = await res.json();
        setCustomers(data);
      } catch (err) {
        console.error("❌ 顧客取得エラー:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">顧客一覧</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table className="w-full border border-gray-300 bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">ID</th>
              <th className="border p-2 text-left">名前</th>
              <th className="border p-2 text-left">メール</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="border p-2">{c.id}</td>
                <td className="border p-2">
                  {c.lastName ?? ""} {c.firstName ?? ""}
                </td>
                <td className="border p-2">{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
