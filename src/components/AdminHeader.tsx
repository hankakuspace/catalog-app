// src/components/AdminHeader.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { InlineStack } from "@shopify/polaris";

export default function AdminHeader() {
  const router = useRouter();

  const menuItems = [
    { label: "Catalog List", path: "/admin/catalogs" },
    { label: "New Record", path: "/admin/catalogs/new" },
  ];

  return (
    <div style={{ marginBottom: "40px" }}>
      <InlineStack align="start" gap="400">
        {menuItems.map((item) => {
          const isActive = router.pathname === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <span
                style={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#000" : "#666", // ✅ アクティブ時は黒
                  borderBottom: isActive
                    ? "2px solid #000"
                    : "2px solid transparent",
                  paddingBottom: "4px",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </InlineStack>
    </div>
  );
}
