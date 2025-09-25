// src/pages/exitiframe.tsx
import { NextPage } from "next";

const ExitIframe: NextPage = () => {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const redirectUrl = params?.get("redirectUrl") || "";

  return (
    <html>
      <head>
        {/* ✅ トップレベルで即リダイレクト */}
        {redirectUrl && (
          <meta httpEquiv="refresh" content={`0; url=${redirectUrl}`} />
        )}
      </head>
      <body>
        <p>Redirecting to authentication...</p>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const params = new URLSearchParams(window.location.search);
              const redirectUrl = params.get("redirectUrl");
              if (redirectUrl) {
                window.location.href = redirectUrl;
              }
            `,
          }}
        />
      </body>
    </html>
  );
};

export default ExitIframe;
