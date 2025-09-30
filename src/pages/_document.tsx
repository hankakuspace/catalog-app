// src/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        {/* ✅ Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans&family=Noto+Serif&family=Noto+Sans+JP&family=Noto+Serif+JP&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
