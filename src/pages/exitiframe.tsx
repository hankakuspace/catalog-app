// src/pages/exitiframe.tsx
import { NextPage } from "next";

const ExitIframe: NextPage = () => {
  // ✅ クエリをすべて保持したまま meta refresh で遷移
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Redirecting...</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var params = new URLSearchParams(window.location.search);
                var redirectUrl = params.get("redirectUrl") || "/api/auth";
                var cleanUrl = redirectUrl.replace(/([&?])embedded=1&?/, "$1");

                // ✅ meta refresh を書き換え
                var meta = document.createElement("meta");
                meta.httpEquiv = "refresh";
                meta.content = "0;url=" + cleanUrl;
                document.head.appendChild(meta);
              })();
            `,
          }}
        />
      </head>
      <body>
        <p>Redirecting out of iframe...</p>
      </body>
    </html>
  );
};

export default ExitIframe;
