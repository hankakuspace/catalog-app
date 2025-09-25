// src/pages/exitiframe.tsx
import { NextPage } from "next";

const ExitIframe: NextPage = () => {
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
                var redirectUrl = params.get("redirectUrl") || "/";
                var cleanUrl = redirectUrl.replace(/([&?])embedded=1&?/, "$1");

                // ✅ JS で即座にリダイレクト
                window.top.location.href = cleanUrl;
              })();
            `,
          }}
        />
      </head>
      <body>
        <p>Redirecting out of iframe...</p>
        {/* ✅ meta refresh fallback */}
        <meta httpEquiv="refresh" content="0; url=/api/auth" />
      </body>
    </html>
  );
};

export default ExitIframe;
