// src/pages/exitiframe.tsx
import { NextPage } from "next";

const ExitIframe: NextPage = () => {
  return (
    <html>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.top === window.self) {
                // すでにトップレベルならそのまま進む
                window.location.href = window.location.search.replace("?redirectUrl=", "");
              } else {
                // iframe 内なら top-level にリダイレクト
                const params = new URLSearchParams(window.location.search);
                const redirectUrl = params.get("redirectUrl");
                window.top.location.href = redirectUrl;
              }
            `,
          }}
        />
      </body>
    </html>
  );
};

export default ExitIframe;
