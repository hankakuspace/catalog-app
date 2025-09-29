// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { AppBridgeProvider } from "@/lib/AppBridgeProvider";
import "@shopify/polaris/build/esm/styles.css";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

export default function MyApp({ Component, pageProps, router }: AppProps) {
  // ✅ /preview 以下は公開ページ → AppBridge / Polaris / AdminLayout を使わない
  if (router.pathname.startsWith("/preview")) {
    return <Component {...pageProps} />;
  }

  // ✅ 管理画面（/admin 等）は Polaris + AppBridge
  return (
    <AppBridgeProvider>
      <PolarisAppProvider i18n={{}}>
        <AdminLayout>
          <Component {...pageProps} />
        </AdminLayout>
      </PolarisAppProvider>
    </AppBridgeProvider>
  );
}
