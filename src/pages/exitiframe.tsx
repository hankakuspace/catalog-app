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
                const params = new URLSearchParams(window.location.search);
                const redirectUrl = params.get("redirectUrl");
                if (!redirectUrl) {
                  console.error("❌ No redirectUrl found");
                  return;
                }

                if (window.top === window.self) {
                  // ✅ すでにトップレベルならそのままリダイレクト
                  window.location.href = redirectUrl;
                } else {
                  // ✅ iframe 内なら、この exitiframe ページを top-level で再読み込み
                  window.top.location.assign(window.location.href);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
};

export default ExitIframe;
