// src/app/api/auth/route.ts
import { shopify } from "@/lib/shopify";
import { NextRequest, NextResponse } from "next/server";

// ✅ OAuth開始（/api/auth にアクセスするとリダイレクト）
export async function GET(req: NextRequest) {
  try {
    const authRoute = await shopify.auth.begin({
      shop: req.nextUrl.searchParams.get("shop")!, // ?shop=xxx.myshopify.com から取得
      callbackPath: "/api/auth/callback",
      isOnline: true, // 顧客ごとにセッションを持つ場合は true
    });

    return NextResponse.redirect(authRoute);
  } catch (error) {
    console.error("❌ Auth error:", error);
    return NextResponse.json({ error: "Auth initialization failed" }, { status: 500 });
  }
}
