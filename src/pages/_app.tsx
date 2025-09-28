// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { AppBridgeProvider } from "@/lib/AppBridgeProvider";
import "@shopify/polaris/build/esm/styles.css";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import AdminLayout from "@/components/AdminLayout";

export default function MyApp({ Component, pageProps }: AppProps) {
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
