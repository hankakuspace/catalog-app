// src/pages/auth/callback.tsx
import { useEffect } from "react";
import Head from "next/head";
import Script from "next/script";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host") || "";
    const shop = params.get("shop") || "";

    console.log("🔥 DEBUG callback host (raw base64):", host);
    console.log("🔥 DEBUG callback shop:", shop);

    if (!host) {
      console.error("❌ Missing host param in callback");
      return;
    }

    const init = () => {
      const appBridgeGlobal = (window as unknown as Record<string, unknown>)["app-bridge"];
      if (!appBridgeGlobal) {
        console.error("❌ AppBridge not loaded");
        return;
      }

      type AppBridgeModule = {
        default: (config: { apiKey: string; host: string }) => unknown;
        actions: {
          Redirect: {
            create: (app: unknown) => {
              dispatch: (action: unknown, path: string) => void;
            };
            Action: {
              APP: string;
              REMOTE: string;
            };
          };
        };
      };

      const appBridgeObj = appBridgeGlobal as AppBridgeModule;

      const app = appBridgeObj.default({
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
        host, // ✅ base64 のまま渡す
      });

      const redirect = appBridgeObj.actions.Redirect.create(app);
      console.log("🔥 DEBUG dispatching redirect to /admin/dashboard ...");
      redirect.dispatch(appBridgeObj.actions.Redirect.Action.APP, "/admin/dashboard");
    };

    // app-bridge 読み込み後に実行
    (window as any).onAppBridgeReady = init;
  }, []);

  return (
    <>
      <Head>
        <title>Auth Callback</title>
      </Head>
      <p>Redirecting back to app...</p>
      <Script
        src="https://unpkg.com/@shopify/app-bridge@3"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("🔥 AppBridge script loaded (beforeInteractive)");
          if ((window as any).onAppBridgeReady) {
            (window as any).onAppBridgeReady();
          }
        }}
      />
    </>
  );
}
