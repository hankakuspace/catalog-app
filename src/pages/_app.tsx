// src/pages/_app.tsx
import type { AppProps } from "next/app";
import "@/styles/globals.css";   // ✅ Tailwind
import "@shopify/polaris/build/esm/styles.css";
import { AppBridgeProvider } from "@/lib/AppBridgeProvider";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

export default function MyApp({ Component, pageProps, router }: AppProps) {
  // ✅ /preview 以下は公開ページ
  if (router.pathname.startsWith("/preview")) {
    return <Component {...pageProps} />;
  }

  // ✅ 管理画面
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
