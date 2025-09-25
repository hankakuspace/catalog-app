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

      const createApp = appBridgeObj.default;
      const Redirect = appBridgeObj.actions.Redirect;

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
