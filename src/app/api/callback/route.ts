// src/app/api/auth/callback/route.ts
import { shopify } from "@/lib/shopify";
import { NextRequest, NextResponse } from "next/server";

// ✅ OAuthコールバック処理
export async function GET(req: NextRequest) {
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
    });

    // 🔹 認証済みセッションを保存（例: FirestoreやDBに）
    const session = callback.session;

    console.log("✅ Auth success:", session);

    // 認証後、アプリの管理画面にリダイレクト
    return NextResponse.redirect(new URL("/admin", req.url));
  } catch (error) {
    console.error("❌ Auth callback error:", error);
    return NextResponse.json({ error: "Auth callback failed" }, { status: 500 });
  }
}
