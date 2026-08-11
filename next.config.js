const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Vercel無料プランの画像最適化枠(月1000枚)を超えると402で全画像が壊れるため、
    // 最適化を通さず元画像を直接配信する(フライヤーは外部ホスト由来で数が多い)。
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = withNextIntl(nextConfig);
