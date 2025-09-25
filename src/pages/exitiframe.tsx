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
                let redirectUrl = window.location.origin + "/api/auth" + window.location.search;

                // ✅ embedded=1 を削除
                redirectUrl = redirectUrl.replace(/([&?])embedded=1&?/, "$1");

                // ✅ iframe 内ならトップレベルでクリーン URL を開く
                if (window.top !== window.self) {
                  window.top.location.href = redirectUrl;
                  return;
                }

                // ✅ 既にトップレベルならそのまま遷移
                window.location.href = redirectUrl;
              })();
            `,
          }}
        />
      </body>
    </html>
  );
};

export default ExitIframe;
