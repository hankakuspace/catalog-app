// src/pages/auth/callback.tsx
import { useEffect } from "react";
import Head from "next/head";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host") || "";
    const shop = params.get("shop") || "";

    console.log("🔥 DEBUG callback host:", host);
    console.log("🔥 DEBUG callback shop:", shop);

    (async () => {
      const AppBridge = (window as unknown as Record<string, unknown>)["app-bridge"];
      if (!AppBridge) {
        console.error("❌ AppBridge not loaded");
        return;
      }

      const createApp = (AppBridge as any).default;
      const Redirect = (AppBridge as any).actions.Redirect;

      const app = createApp({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
        host,
      });

      const redirect = Redirect.create(app);
      console.log("🔥 DEBUG dispatching redirect to /admin/dashboard ...");
      redirect.dispatch(Redirect.Action.APP, "/admin/dashboard");
    })();
  }, []);

  return (
    <>
      <Head>
        <script src="https://unpkg.com/@shopify/app-bridge@3" defer></script>
      </Head>
      <p>Redirecting back to app...</p>
    </>
  );
}
