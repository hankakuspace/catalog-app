// src/pages/exitiframe.tsx
import { NextPage } from "next";

const ExitIframe: NextPage = () => {
  return (
    <html>
      <body>
        <p>Redirecting out of iframe...</p>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var params = new URLSearchParams(window.location.search);
                var redirectUrl = params.get("redirectUrl") || "/";
                var cleanUrl = redirectUrl.replace(/([&?])embedded=1&?/, "$1");

                // ✅ Shopify公式推奨: document.write 経由で top-level redirect
                document.write('<script>window.top.location.href="' + cleanUrl + '";<\\/script>');
              })();
            `,
          }}
        />
      </body>
    </html>
  );
};

export default ExitIframe;
