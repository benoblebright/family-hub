import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 홈 폴더에 다른 package-lock.json이 있어 루트를 잘못 잡는 경고가 나서 고정
  outputFileTracingRoot: process.cwd(),
  experimental: {
    // 음성 답장 업로드 (1~2분 녹음)
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
