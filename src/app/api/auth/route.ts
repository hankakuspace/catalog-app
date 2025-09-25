// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify";

export async function GET(req: NextRequest) {
  try {
    const shop = req.nextUrl.searchParams.get("shop");

    console.log("🔥 DEBUG auth.begin start", {
      shop,
      appUrl: process.env.SHOPIFY_APP_URL,
      apiKey: process.env.SHOPIFY_API_KEY,
      scopes: process.env.SHOPIFY_SCOPES,
    });

    const authRoute = await shopify.auth.begin({
      shop: shop!,
      callbackPath: "/api/auth/callback",
      isOnline: true,
      rawRequest: req,
    });

    console.log("🔥 DEBUG authRoute:", authRoute);

    return NextResponse.redirect(authRoute);
  } catch (error) {
    console.error("❌ Auth begin error:", error);

    return NextResponse.json(
      {
        error: "Auth begin failed",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
