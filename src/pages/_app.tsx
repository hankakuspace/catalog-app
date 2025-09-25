// src/pages/_app.tsx
import type { AppProps } from "next/app";
import { AppBridgeProvider } from "@/lib/AppBridgeProvider";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppBridgeProvider>
      <Component {...pageProps} />
    </AppBridgeProvider>
  );
}
