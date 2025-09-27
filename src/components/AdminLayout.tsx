// src/components/AdminContentLayout.tsx
import { ReactNode } from "react";

interface AdminContentLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export default function AdminContentLayout({ left, right }: AdminContentLayoutProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "3fr 1fr",
        gap: "20px",
        marginTop: "20px",
        width: "100%",
      }}
    >
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
