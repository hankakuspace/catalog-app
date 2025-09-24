// src/pages/api/auth/index.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // クエリをそのまま引き継いで /api/auth/shopify にリダイレクト
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(`/api/auth/shopify${qs ? `?${qs}` : ""}`);
}
