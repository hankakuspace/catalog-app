// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  try {
    const authRoute = await shopify.auth.begin({
      shop: req.nextUrl.searchParams.get("shop")!, // ?shop=xxx.myshopify.com
      callbackPath: "/api/auth/callback",
      isOnline: true, // 顧客ごとにセッションを持つ場合は true
      rawRequest: req, // ✅ 追加
    });

    return NextResponse.redirect(authRoute);
  } catch (error) {
    console.error("❌ Auth begin error:", error);
    return NextResponse.json({ error: "Auth begin failed" }, { status: 500 });
  }
}
