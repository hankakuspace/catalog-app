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

                // ✅ iframe 内ならトップレベルで開き直す
                if (window.top !== window.self) {
                  window.top.location.href = window.location.href;
                  return;
                }

                // ✅ トップレベルに出てきたら embedded=1 を削除してリダイレクト
                const cleanUrl = redirectUrl.replace(/embedded=1&?/, "");
                window.location.href = cleanUrl;
              })();
            `,
          }}
        />
      </body>
    </html>
  );
};

export default ExitIframe;
