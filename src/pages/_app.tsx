// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { AppBridgeProvider } from "@/lib/AppBridgeProvider";

// Polaris
import "@shopify/polaris/build/esm/styles.css";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppBridgeProvider>
      <PolarisAppProvider i18n={{}}>
        <Component {...pageProps} />
      </PolarisAppProvider>
    </AppBridgeProvider>
  );
}
