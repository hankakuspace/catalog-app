// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Vercelビルド時のESLintチェックをスキップ
  eslint: {
    ignoreDuringBuilds: true,
  },

  // （必要であれば追加オプションをここに記載）
  // reactStrictMode: true,
  // swcMinify: true,
};

export default nextConfig;
